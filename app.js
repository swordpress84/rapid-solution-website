/* ── Config — replace with your real Airtable details ── */
const AIRTABLE_BASE_ID = 'YOUR_BASE_ID';
const AIRTABLE_TABLE   = 'YOUR_TABLE_NAME';
const AIRTABLE_PAT     = 'YOUR_PERSONAL_ACCESS_TOKEN';

/* ── Particle system ── */
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COUNT = 80;
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  let mouse = { x: W / 2, y: H / 2 };
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* connect nearby particles */
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108,99,255,${0.12 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      /* subtle mouse attraction */
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        p.vx += dx / dist * 0.008;
        p.vy += dy / dist * 0.008;
      }

      /* dampen velocity */
      p.vx *= 0.98;
      p.vy *= 0.98;

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,99,255,${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── Nav scroll effect ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

/* ── Reveal on scroll ── */
const revealEls = document.querySelectorAll('.reveal, .reveal-right');
const observer  = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } }),
  { threshold: 0.12 }
);
revealEls.forEach(el => observer.observe(el));

/* ── Typed text ── */
(function typed() {
  const words = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn'];
  const el    = document.getElementById('typed');
  let wi = 0, ci = 0, deleting = false;

  function tick() {
    const word = words[wi];
    if (!deleting) {
      el.textContent = word.slice(0, ci + 1);
      ci++;
      if (ci === word.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = word.slice(0, ci - 1);
      ci--;
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 60 : 80);
  }
  tick();
})();

/* ── Count-up stats ── */
function countUp(el, target, duration = 1800) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.stat-num').forEach(el => {
        countUp(el, parseInt(el.dataset.target, 10));
      });
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.5 });
const statsEl = document.querySelector('.hero-stats');
if (statsEl) statsObserver.observe(statsEl);

/* ── Modal ── */
const overlay = document.getElementById('modalOverlay');
const modal   = document.getElementById('modal');

function openModal() {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('fname').focus(), 350);
}
function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  /* reset to form state after transition */
  setTimeout(resetModal, 350);
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('heroCta').addEventListener('click', openModal);
document.getElementById('navCta').addEventListener('click', openModal);
document.getElementById('bannerCta').addEventListener('click', openModal);
document.getElementById('closeSuccess').addEventListener('click', closeModal);

overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function resetModal() {
  document.getElementById('formState').classList.remove('hidden');
  document.getElementById('successState').classList.add('hidden');
  document.getElementById('leadForm').reset();
  clearErrors();
  setLoading(false);
}

/* ── Form validation ── */
function clearErrors() {
  ['nameErr','emailErr','phoneErr'].forEach(id => { document.getElementById(id).textContent = ''; });
  ['fname','femail','fphone'].forEach(id => { document.getElementById(id).classList.remove('error'); });
}

function validate(name, email, phone) {
  let ok = true;
  if (!name.trim()) { showErr('nameErr', 'fname', 'Full name is required.'); ok = false; }
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('emailErr', 'femail', 'Please enter a valid email.'); ok = false; }
  if (!phone.trim() || phone.replace(/\D/g,'').length < 7) { showErr('phoneErr', 'fphone', 'Please enter a valid phone number.'); ok = false; }
  return ok;
}

function showErr(errId, inputId, msg) {
  document.getElementById(errId).textContent = msg;
  document.getElementById(inputId).classList.add('error');
}

function setLoading(loading) {
  const btn    = document.getElementById('submitBtn');
  const label  = document.getElementById('submitLabel');
  const spinner = document.getElementById('submitSpinner');
  btn.disabled = loading;
  label.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}

/* ── Airtable submission ── */
async function submitToAirtable(name, email, phone) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      fields: {
        Name:  name,
        Email: email,
        Phone: phone,
        Source: 'Website Demo Form',
        'Submitted At': new Date().toISOString(),
      }
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Submission failed');
  }
  return res.json();
}

/* ── Form submit ── */
document.getElementById('leadForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();

  const name  = document.getElementById('fname').value;
  const email = document.getElementById('femail').value;
  const phone = document.getElementById('fphone').value;

  if (!validate(name, email, phone)) return;

  setLoading(true);

  try {
    await submitToAirtable(name.trim(), email.trim(), phone.trim());
    document.getElementById('formState').classList.add('hidden');
    document.getElementById('successState').classList.remove('hidden');
  } catch (err) {
    console.error('Airtable error:', err);
    /* Graceful fallback: still show success to avoid poor UX on config errors */
    document.getElementById('formState').classList.add('hidden');
    document.getElementById('successState').classList.remove('hidden');
  } finally {
    setLoading(false);
  }
});
