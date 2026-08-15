# Aarambh AI — website

A one-page marketing site for Aarambh AI with a working, secured contact form backend. Static frontend (`public/`) served by a small Express API (`server.js`).

## What's inside

```
aarambh-ai/
├── public/           ← the actual website (HTML/CSS/JS)
├── server.js          ← Express server + secure /api/contact endpoint
├── package.json
├── .env.example        ← copy to .env for local dev, never commit the real .env
├── .gitignore
└── render.yaml         ← lets Render auto-configure the service
```

## Security measures already in place

- **Helmet** sets a strict Content-Security-Policy, HSTS (production only), and the standard hardening headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc.).
- **Rate limiting** on `/api/contact` — 5 submissions per 15 minutes per IP.
- **Server-side validation** on every field with `express-validator` (client-side checks exist too, but the server never trusts them).
- **Honeypot field** on the contact form to silently drop bot submissions.
- **CORS locked down** — only your own domain (set via `ALLOWED_ORIGIN`) can call the API in production.
- **No secrets in the repo** — `.env` is git-ignored; real credentials only ever live in Render's environment variable settings.
- **Request body size capped** at 20kb to blunt payload-based abuse.
- **Generic error responses** — the server never leaks stack traces or internal details to the client.

## Run it locally

```bash
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:3000`. Without SMTP configured, contact form submissions are just logged to the console — the form still works end to end, you just won't get an email yet.

## Deploy: GitHub → Render

**1. Push to GitHub**

```bash
cd aarambh-ai
git init
git add .
git commit -m "Aarambh AI website"
git branch -M main
git remote add origin https://github.com/<your-username>/aarambh-ai.git
git push -u origin main
```

**2. Create the service on Render**

- Go to [render.com](https://render.com) → **New +** → **Web Service**
- Connect your GitHub repo
- Render will detect `render.yaml` automatically and pre-fill:
  - Build command: `npm install`
  - Start command: `npm start`
- Under **Environment**, set:
  - `ALLOWED_ORIGIN` → your Render URL once you have it, e.g. `https://aarambh-ai.onrender.com`
  - (Optional, to actually receive contact form emails) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `TO_EMAIL`
- Deploy. Render provides HTTPS automatically — that's what makes the HSTS header meaningful.

**3. Getting email to actually send**

The form works without this — submissions are just logged — but to receive them by email, add SMTP credentials in Render's environment settings. Easiest options:
- A transactional email service like **Resend** or **SendGrid** (free tier, better deliverability than personal Gmail)
- Gmail with an **App Password** (not your normal password — generate one under Google Account → Security → App Passwords)

## Editing content

All copy lives in `public/index.html`. Colors, fonts, and spacing are CSS custom properties at the top of `public/css/style.css` (`:root { ... }`) — change values there rather than hunting through individual rules.

## Before you go fully live

- [ ] Point a custom domain at the Render service (Render supports this on the free tier)
- [ ] Set `ALLOWED_ORIGIN` to your real domain
- [ ] Add real SMTP credentials so contact submissions reach your inbox
- [ ] Swap the placeholder "How we work" / portfolio copy for real project details once you have 1–2 case studies
- [ ] Run `npm audit` occasionally and keep dependencies updated
