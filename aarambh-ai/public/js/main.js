// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Mobile nav =====
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
navToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

// ===== Terminal type-on effect =====
const lines = [
  { text: '$ aarambh deploy --env production', cls: '' },
  { text: '✓ build passed · 0 vulnerabilities found', cls: 'ok' },
  { text: '✓ AWS stack updated · eu / ap-south-1', cls: 'ok' },
  { text: '$ status: live', cls: 'muted' },
];
const body = document.getElementById('terminalBody');
let li = 0, ci = 0;

function typeLine() {
  if (li >= lines.length) return;
  const { text, cls } = lines[li];
  if (ci === 0) {
    const div = document.createElement('div');
    div.className = cls;
    div.innerHTML = '';
    body.appendChild(div);
  }
  const current = body.lastElementChild;
  if (ci <= text.length) {
    current.textContent = text.slice(0, ci);
    ci++;
    setTimeout(typeLine, 18 + Math.random() * 22);
  } else {
    li++; ci = 0;
    setTimeout(typeLine, 320);
  }
}
setTimeout(typeLine, 600);

// ===== Contact form: client-side validation + secure submit =====
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', !!isError);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');

  const data = Object.fromEntries(new FormData(form).entries());

  // Client-side checks (server re-validates everything — never trust the client)
  if (!data.name || data.name.trim().length < 2) return setStatus('Please enter your name.', true);
  if (!EMAIL_RE.test(data.email || '')) return setStatus('Please enter a valid email.', true);
  if (!data.service) return setStatus('Please select what you need.', true);
  if (!data.message || data.message.trim().length < 10) return setStatus('Please add a few more details (10+ characters).', true);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json().catch(() => ({}));

    if (res.status === 429) {
      setStatus('Too many requests — please try again in a few minutes.', true);
    } else if (!res.ok) {
      setStatus(result.error || 'Something went wrong. Please try again.', true);
    } else {
      setStatus("Sent — we'll get back to you within a day.");
      form.reset();
    }
  } catch (err) {
    setStatus('Network error — please check your connection and try again.', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send message';
  }
});
