# Private contact delivery

The contact page uses `GET /api/contact/status` to check configuration and
`POST /api/contact` to send a plain-text email. The destination and SMTP
credentials are read only by the backend. The visitor's email is `Reply-To`;
the authenticated account remains the sender.

## Configure delivery

For local development, edit `api/.env.local` using the names in
[`api/.env.example`](../api/.env.example). Preserve any destination already set
there. The local file is ignored by Git and Docker. Start the backend from `api/`:

```bash
uvicorn index:app --reload --port 8000 --env-file .env.local
```

For production, set these variables in the backend host's secret/environment
settings, then redeploy or restart. A local file does not configure a hosted API.
Never prefix mail settings with `VITE_` or put credentials in source code.

| Variable | Value |
| --- | --- |
| `CONTACT_TO_EMAIL` | Private inbox that receives messages |
| `CONTACT_FROM_EMAIL` | Sending account, or a sender authorized by the provider |
| `SMTP_HOST` | Provider's SMTP host |
| `SMTP_PORT` | `465` for implicit TLS, or `587` for STARTTLS |
| `SMTP_SECURITY` | `ssl` or `starttls`; unencrypted transport is rejected |
| `SMTP_USERNAME` | Provider's SMTP username |
| `SMTP_PASSWORD` | Provider's SMTP credential, stored as a secret |

For Gmail, use `smtp.gmail.com`, port `465`, `SMTP_SECURITY=ssl`, and your full
sending Gmail address for both `SMTP_USERNAME` and `CONTACT_FROM_EMAIL`.
Create a dedicated app password in your Google Account and store it directly in
the private server configuration. Google requires 2-Step Verification for app
passwords; some accounts do not offer them. See Google's
[app-password instructions](https://support.google.com/accounts/answer/185833)
and [SMTP documentation](https://developers.google.com/workspace/gmail/imap/imap-smtp).
Keep passwords out of chat. If your provider disables app passwords, use a
provider that supplies SMTP credentials; this implementation does not use OAuth.

## Verify

`GET /api/contact/status` returns only `{"available": true}` or `false`; it does
not contact SMTP or expose the recipient. With settings missing or invalid, the
form stays disabled. With settings present, submit a short message you intend to
send and check the destination inbox and spam folder. HTTP 202 means the SMTP
server accepted the message; it does not guarantee inbox arrival.

Automated tests mock SMTP and send no real emails. Failed or timed-out browser
requests preserve the draft; there is no automatic resend. A timeout can happen
after provider acceptance, so check the inbox before manually retrying.

The app limits contact submissions to five per connection address and twenty
total per ten minutes **per process**, and rejects a filled honeypot field.
Configure a shared rate limit at your host/edge for a public deployment with
multiple workers or serverless instances. Proxy configurations can cause users
to share a connection address. CORS and the honeypot do not authenticate visitors.

Messages are sent synchronously with TLS and bounded socket waits. No message
body, address, password, or provider error text is written by the app's contact
logger. Provider/inbox retention and hosting access logs are controlled separately.
The destination remains visible to the email provider and inbox owner.
