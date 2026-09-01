# Kurrier
The self-hosted open-source workspace for **email, calendars, contacts and storage**.

> If Kurrier is useful to you, please consider ⭐ starring the repository and sharing it with others who care about open, self-hosted infrastructure. Word of mouth and GitHub stars help the project grow, attract contributors, and accelerate development.


## ✨ What's New

### 🎉 Generic OIDC/SSO support

Kurrier now supports **generic OpenID Connect (OIDC)** authentication, making it possible to use your own identity provider for SSO.

Configure Kurrier with any standards-compliant OIDC provider alongside the existing Google authentication support.

[OIDC / SSO Documentation](https://www.kurrier.org/docs/authentication/oidc)

<img src="https://www.kurrier.org/docs-sso.jpg" alt="Kurrier SSO" width="600" />


### 🎉 Management API

Kurrier now includes a **Management API** for programmatic provisioning and integration with external applications.

Use the API to provision users, configure SMTP/IMAP accounts, and create email identities. An optional instance-level admin API key allows trusted infrastructure to manage accounts before a user's first login.

[API Documentation](https://www.kurrier.org/docs/api)


### 🎉 Kurrier Message Inspector 

![img.png](https://www.kurrier.org/docs-message-inspector.png)

Kurrier now includes a built-in **Message Inspector** that lets you look beyond the rendered email.
Instead of only displaying what the recipient sees, Kurrier exposes the underlying message structure so developers, QA engineers, support teams, and operators can quickly inspect and debug email without leaving the inbox.

### 🎉 Kurrier Drive — integrated **WebDAV/S3 storage**
Store and manage files directly within Kurrier using **WebDAV** locally or S3-compatible storage
Support for providers like AWS S3, Backblaze B2, MinIO, and DigitalOcean Spaces is coming soon.
Have a provider you want first? Open an issue and let us know.

![Kurrier Drive](https://www.kurrier.org/docs-drive-light.png)


### 🎉 Sync your calendars across all your devices
Kurrier now supports Calendars and syncs your calendars through **CalDAV**, compatible with iOS, macOS, Android (DAVx⁵), Thunderbird, and all CalDAV-supporting apps.

![Kurrier Calendar](https://www.kurrier.org/docs-calendar-light.png)

#### Dark Mode:

![Kurrier Calendar](https://www.kurrier.org/docs-calendar-dark.png)

### 🎉 Full **CardDAV support** — sync your contacts across all your devices
Kurrier now supports **complete CardDAV sync**, meaning your address book updates instantly across iOS, macOS, Android (DAVx⁵), Thunderbird, and any CardDAV-compatible app.

![Kurrier Contacts](https://www.kurrier.org/docs-contact.png)


---

### 🎉 Kurrier now supports **Labels**
Organize your inbox your way with flexible, multi-color labels.

---

## 🚀 What is Kurrier?

Kurrier is a **self-hosted, unified communication platform** that brings together:

- 📧 Email (IMAP/SMTP/SES/SendGrid/Mailgun/Postmark)
- 📅 Calendars (CalDAV)
- 👤 Contacts (CardDAV)

All wrapped into a clean, fast, modern web UI — entirely powered by **your** providers and hosted on **your** infrastructure.

Kurrier lets you:

- Connect **any email provider**
- Sync calendars across devices
- Sync contacts across devices
- Manage multiple identities and domains
- Use SES/SendGrid/Mailgun as outbound identities
- Keep all data private and under your control

Whether you're running a personal server, a small-business mail setup, or a multi-domain environment, Kurrier gives you a **beautiful unified interface** without losing control of your data.

### 📮 How mailbox connections work

Kurrier keeps three email concepts separate internally:

- an **SMTP/IMAP account** stores the encrypted connection credentials;
- an **email identity** represents the address and display name used to send mail;
- **mailboxes** are the Inbox, Sent, Trash, and other folders discovered from IMAP.

For an instance-configured custom provider with IMAP, Kurrier creates all three
as one **Add mailbox** flow. It verifies the connection before creating the
email identity, then starts mailbox synchronization automatically.
SMTP-only presets still create an account without an inbox, while the manual
Generic SMTP and Identity screens remain available for aliases and advanced
configurations.

Mailbox discovery and synchronization are handled by the worker service, so the
worker must be running when an IMAP mailbox is connected.

---

## 💡 Why Kurrier?

Kurrier is designed as a next-generation alternative to traditional webmail and PIM suites:

- **Connect any provider**  
  IMAP, SMTP, SES, SendGrid, Mailgun, Postmark — or your own mail server.

- **Unified web interface**  
  Email, calendars, and contacts — consistent, fast.

- **Self-hosted first**  
  Your data stays on *your* server. No third-party analytics. No vendor lock-in.

- **Open standards**  
  IMAP/SMTP for mail, CalDAV for calendars, CardDAV for contacts.

- **Modern app stack**  
  Next.js • TypeScript • Nitro • PostgreSQL — fast and extensible.

- **Developer-friendly**  
  Clean APIs, delta sync model, extensible providers.

- **Docker-ready**  
  Simple, reliable deployments.

Kurrier aims to combine the simplicity of a webmail client with the flexibility of a complete, modern communication backend — all under your control.

---

## 📘 Next Steps

Ready to try it out?

👉 **[Read the documentation](https://www.kurrier.org)**  
Guides include installation, provider setup, instructions, and more.

---

## 🖥 Screenshots

### 📨 Webmail View
Minimal, fast, keyboard-first email.

![Kurrier Webmail View](https://www.kurrier.org/light-label-demo.png)

---

### 🌙 Dark Mode
A beautiful, fully themed dark interface.

![Kurrier Webmail View](https://www.kurrier.org/dark-label-demo.png)

---

### 🔌 Providers View
Connect IMAP/SMTP/SES/SendGrid/Mailgun/Postmark with ease.

![Kurrier Providers View](https://www.kurrier.org/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-providers.167aad5f.png&w=1920&q=100)

---

### 👤 Identity View
Manage multiple sender identities across providers.

![Kurrier Identity View](https://www.kurrier.org/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-identities.ea020d9f.png&w=1920&q=100)

---

## 💙 Support Kurrier

Kurrier is an independent, open-source project built to make private, modern email infrastructure accessible and self-hosted.

If you find it useful, please consider supporting development:

👉 **[Donate to Kurrier](https://buy.stripe.com/dRmfZje75d4OaGG8ux3Nm00)**

Every contribution helps with hosting, maintenance, and new features.

Thank you for supporting privacy-friendly communication software.

---

## 🛠 Commercial Support

Need help integrating Kurrier into your business or infrastructure?

👉 **[Request Consulting](https://www.krishnarokhale.com)**

---

## 🤝 Contributing

Contributions are welcome.

Please read the guidelines:  
👉 **[Contributing Guide](https://www.kurrier.org/docs/contributing)**

PRs, issues, ideas, and feedback are all appreciated.

---

## Web Push configuration

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the worker and web environments. Generate keys with `pnpm exec web-push generate-vapid-keys`; never commit the private key.
