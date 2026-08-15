require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || null; // e.g. https://aarambh-ai.onrender.com

app.disable('x-powered-by');

// Trust Render's proxy so rate-limiting sees the real client IP, not the proxy IP
app.set('trust proxy', 1);

// ===== Security headers =====
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// HSTS only makes sense once you're actually on HTTPS in production (Render provides this)
if (NODE_ENV === 'production') {
  app.use(
    helmet.hsts({
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    })
  );
}

// ===== CORS: only same-origin (or an explicitly allowed origin) may call the API =====
app.use(
  cors({
    origin: ALLOWED_ORIGIN ? [ALLOWED_ORIGIN] : true,
    methods: ['GET', 'POST'],
  })
);

// ===== Body parsing with a strict size limit (mitigates payload-based DoS) =====
app.use(express.json({ limit: '20kb' }));

// ===== Static site =====
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: NODE_ENV === 'production' ? '1d' : 0,
    index: 'index.html',
  })
);

// ===== Rate limiting on the contact endpoint =====
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// A very small in-memory list of allowed "service" values, validated server-side
const ALLOWED_SERVICES = ['ai-ml', 'data', 'aws', 'devops', 'not-sure'];

app.post(
  '/api/contact',
  contactLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').trim().isEmail().normalizeEmail().isLength({ max: 150 }),
    body('service').trim().isIn(ALLOWED_SERVICES),
    body('message').trim().isLength({ min: 10, max: 2000 }).escape(),
    // Honeypot: real users never fill this in. Bots that auto-fill every field will.
    body('website').custom((value) => {
      if (value && value.length > 0) {
        throw new Error('spam detected');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Don't leak which field tripped a honeypot — just say the input was invalid.
      return res.status(400).json({ error: 'Please check your details and try again.' });
    }

    const { name, email, service, message } = req.body;

    try {
      await sendContactEmail({ name, email, service, message });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Failed to process contact submission:', err.message);
      return res.status(500).json({ error: 'Something went wrong on our end. Please email us directly.' });
    }
  }
);

// ===== Email delivery (only active once SMTP env vars are set) =====
async function sendContactEmail({ name, email, service, message }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TO_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !TO_EMAIL) {
    // No SMTP configured yet — log locally so the form still works during setup/dev.
    console.log('[contact form submission — SMTP not configured, logging only]', {
      name,
      email,
      service,
      message,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"Aarambh AI Website" <${SMTP_USER}>`,
    to: TO_EMAIL,
    replyTo: email,
    subject: `New enquiry: ${service}`,
    text: `Name: ${name}\nEmail: ${email}\nService: ${service}\n\n${message}`,
  });
}

// ===== 404 for unknown API routes =====
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ===== Generic error handler (never leak stack traces to the client) =====
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`Aarambh AI site running on port ${PORT} [${NODE_ENV}]`);
});
