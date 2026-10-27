import smtplib
import ssl
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import contact
import index

client = TestClient(index.app)
payload = {"name": "Test Player", "email": "player@example.com", "message": "I have feedback about the cover-drive practice."}


@pytest.fixture(autouse=True)
def private_mail_settings(monkeypatch):
    settings = {
        "SMTP_HOST": "smtp.example.com", "SMTP_PORT": "465", "SMTP_SECURITY": "ssl",
        "SMTP_USERNAME": "sender@example.com", "SMTP_PASSWORD": "test-password",
        "CONTACT_FROM_EMAIL": "sender@example.com", "CONTACT_TO_EMAIL": "private@example.com",
    }
    for key, value in settings.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(contact, "limiter", contact.ContactLimiter())


def test_status_does_not_expose_private_delivery_configuration(monkeypatch):
    assert client.get("/api/contact/status").json() == {"available": True}
    monkeypatch.delenv("SMTP_PASSWORD")
    assert client.get("/api/contact/status").json() == {"available": False}
    response = client.post("/api/contact", json=payload)
    assert response.status_code == 503
    assert "private@example.com" not in response.text


@pytest.mark.parametrize("security", ["ssl", "starttls"])
def test_contact_uses_authenticated_tls_and_private_server_recipient(monkeypatch, security):
    monkeypatch.setenv("SMTP_SECURITY", security)
    smtp = MagicMock()
    smtp.send_message.return_value = {}
    factory = MagicMock(return_value=smtp)
    monkeypatch.setattr(contact.smtplib, "SMTP_SSL" if security == "ssl" else "SMTP", factory)
    response = client.post("/api/contact", json=payload)
    assert response.status_code == 202
    message = smtp.send_message.call_args.args[0]
    assert message["From"] == "sender@example.com"
    assert message["To"] == "private@example.com"
    assert message["Reply-To"] == "player@example.com"
    assert "Test Player" in message.get_content()
    assert "private@example.com" not in response.text
    smtp.login.assert_called_once_with("sender@example.com", "test-password")
    if security == "starttls":
        assert smtp.starttls.call_args.kwargs["context"].verify_mode == ssl.CERT_REQUIRED
    else:
        assert factory.call_args.kwargs["context"].verify_mode == ssl.CERT_REQUIRED
    smtp.close.assert_called_once()


@pytest.mark.parametrize("invalid", [
    {**payload, "email": "invalid"}, {**payload, "name": "   "},
    {**payload, "name": "Name\r\nBcc: victim@example.com"},
    {**payload, "message": "short"}, {**payload, "message": "x" * 4001},
])
def test_invalid_submissions_are_rejected_before_delivery(monkeypatch, invalid):
    deliver = MagicMock()
    monkeypatch.setattr(contact, "deliver_contact", deliver)
    assert client.post("/api/contact", json=invalid).status_code == 422
    deliver.assert_not_called()


def test_honeypot_is_rejected_without_sending(monkeypatch):
    deliver = MagicMock()
    monkeypatch.setattr(contact, "deliver_contact", deliver)
    assert client.post("/api/contact", json={**payload, "website": "spam"}).status_code == 400
    deliver.assert_not_called()


def test_provider_failure_is_reported_without_logging_message_or_credentials(monkeypatch, caplog):
    monkeypatch.setattr(contact, "deliver_contact", MagicMock(side_effect=smtplib.SMTPAuthenticationError(535, b"test-password")))
    response = client.post("/api/contact", json=payload)
    assert response.status_code == 502
    for private in ("test-password", payload["message"], payload["email"], "private@example.com"):
        assert private not in response.text
        assert private not in caplog.text


def test_connection_cleanup_cannot_turn_accepted_delivery_into_a_failure(monkeypatch):
    smtp = MagicMock()
    smtp.send_message.return_value = {}
    smtp.close.side_effect = OSError("Connection already closed")
    monkeypatch.setattr(contact.smtplib, "SMTP_SSL", MagicMock(return_value=smtp))
    assert client.post("/api/contact", json=payload).status_code == 202


def test_submission_limit_prevents_extra_delivery_and_expires(monkeypatch):
    now = [0]
    monkeypatch.setattr(contact.time, "monotonic", lambda: now[0])
    deliver = MagicMock()
    monkeypatch.setattr(contact, "deliver_contact", deliver)
    for _ in range(5):
        assert client.post("/api/contact", json=payload).status_code == 202
    assert client.post("/api/contact", json=payload).status_code == 429
    assert deliver.call_count == 5
    now[0] = 601
    assert client.post("/api/contact", json=payload).status_code == 202
