"""Private SMTP delivery for the website contact form. Never log message content."""

import logging
import os
import smtplib
import ssl
import threading
import time
from collections import deque
from email.message import EmailMessage

from fastapi import HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator

logger = logging.getLogger("cricket-coach.contact")


class ContactPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=254)
    message: str = Field(min_length=10, max_length=4000)
    website: str = Field(default="", max_length=2000)

    @field_validator("name", "message", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if any(ord(char) < 32 for char in value):
            raise ValueError("Name must not contain control characters")
        return value


class MailSettings(BaseModel):
    host: str = Field(min_length=1)
    port: int = Field(gt=0, le=65535)
    security: str
    username: str = Field(min_length=1)
    password: str = Field(min_length=1, repr=False)
    sender: EmailStr
    recipient: EmailStr

    @field_validator("security")
    @classmethod
    def require_tls(cls, value):
        if value not in ("ssl", "starttls"):
            raise ValueError("SMTP_SECURITY must be ssl or starttls")
        return value


def mail_settings():
    security = os.environ.get("SMTP_SECURITY", "starttls").strip().lower()
    try:
        return MailSettings(
            host=os.environ.get("SMTP_HOST", "").strip(),
            port=os.environ.get("SMTP_PORT", "465" if security == "ssl" else "587"),
            security=security,
            username=os.environ.get("SMTP_USERNAME", "").strip(),
            password=os.environ.get("SMTP_PASSWORD", ""),
            sender=os.environ.get("CONTACT_FROM_EMAIL", "").strip(),
            recipient=os.environ.get("CONTACT_TO_EMAIL", "").strip(),
        )
    except ValidationError:
        return None


class ContactLimiter:
    """Bounded per-process burst protection; deployments also need edge limits."""

    def __init__(self):
        self.clients = {}
        self.total = deque()
        self.lock = threading.Lock()

    def allow(self, client):
        now = time.monotonic()
        cutoff = now - 600
        with self.lock:
            self.clients = {key: events for key, events in self.clients.items() if events[-1] > cutoff}
            while self.total and self.total[0] <= cutoff:
                self.total.popleft()
            events = self.clients.get(client, deque())
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= 5 or len(self.total) >= 20:
                return False
            if client not in self.clients and len(self.clients) >= 2048:
                return False
            events.append(now)
            self.clients[client] = events
            self.total.append(now)
            return True


limiter = ContactLimiter()


def deliver_contact(payload, settings):
    message = EmailMessage()
    message["Subject"] = "Cricket Shadow Coach — website message"
    message["From"] = str(settings.sender)
    message["To"] = str(settings.recipient)
    message["Reply-To"] = str(payload.email)
    message.set_content(f"Name: {payload.name}\nReply email: {payload.email}\n\n{payload.message}\n")
    context = ssl.create_default_context()
    client = None
    try:
        if settings.security == "ssl":
            client = smtplib.SMTP_SSL(settings.host, settings.port, timeout=8, context=context)
        else:
            client = smtplib.SMTP(settings.host, settings.port, timeout=8)
            client.starttls(context=context)
        client.login(settings.username, settings.password)
        refused = client.send_message(message, from_addr=str(settings.sender), to_addrs=[str(settings.recipient)])
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)
    finally:
        if client is not None:
            # Delivery has been accepted once send_message returns successfully.
            # A later QUIT failure must not produce a false failure and retry.
            try:
                client.close()
            except (smtplib.SMTPException, OSError):
                pass


def contact_availability():
    return {"available": mail_settings() is not None}


def submit_contact(payload: ContactPayload, request: Request):
    if payload.website:
        raise HTTPException(status_code=400, detail="Your message could not be accepted. Please try again.")
    settings = mail_settings()
    if settings is None:
        raise HTTPException(status_code=503, detail="Message delivery is temporarily unavailable. Please try again later.")
    # Do not trust arbitrary forwarded-IP headers supplied by callers.
    client = request.client.host if request.client else "unknown"
    if not limiter.allow(client):
        raise HTTPException(status_code=429, detail="Too many messages. Please wait ten minutes before trying again.", headers={"Retry-After": "600"})
    try:
        deliver_contact(payload, settings)
    except (smtplib.SMTPException, OSError) as exc:
        logger.warning("Contact delivery could not be confirmed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail="We could not confirm delivery. Your message is still here; please try again later.") from exc
    return {"message": "Your message was accepted for delivery. Thank you for getting in touch."}
