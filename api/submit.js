import nodemailer from 'nodemailer';

/* App passwords are often pasted WITH spaces ("abcd efgh ijkl mnop").
   Gmail rejects that — strip all whitespace defensively. */
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');

export default async function handler(req, res) {
  /* ── Health check: visit /api/submit in a browser to verify config ── */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      env: {
        AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
        AIRTABLE_TABLE: !!process.env.AIRTABLE_TABLE,
        AIRTABLE_PAT: !!process.env.AIRTABLE_PAT,
        GMAIL_USER: GMAIL_USER || '(missing)',
        GMAIL_APP_PASSWORD_length: GMAIL_PASS.length, // should be 16
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone } = req.body || {};

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  /* ── 1. Save lead to Airtable ── */
  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Email: email,
            Phone: phone,
            Source: 'Website Demo Form',
            'Submitted At': new Date().toISOString(),
          },
        }),
      }
    );

    if (!airtableRes.ok) {
      const err = await airtableRes.json().catch(() => ({}));
      return res.status(500).json({ error: err?.error?.message || 'Airtable error' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Airtable submission failed' });
  }

  /* ── 2. Send confirmation email via Gmail SMTP ── */
  let emailSent = false;
  let emailError = null;

  if (!GMAIL_USER || !GMAIL_PASS) {
    emailError = 'GMAIL_USER or GMAIL_APP_PASSWORD env var is missing';
    console.error(emailError);
  } else {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });

      /* verify() surfaces auth problems with a clear error */
      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"Rapid Solution" <${GMAIL_USER}>`,
        to: email,
        replyTo: GMAIL_USER,
        subject: 'Your Rapid Solution Demo Access',
        text: buildEmailText(name),   // plain-text part improves inbox placement
        html: buildEmailHTML(name),
      });

      emailSent = true;
      console.log('Email sent:', info.messageId, '→', email);
    } catch (err) {
      emailError = err?.message || String(err);
      console.error('Email send failed:', emailError);
    }
  }

  /* Lead is saved regardless; report email status so the client can see it. */
  return res.status(200).json({ success: true, emailSent, emailError });
}

function buildEmailText(name) {
  return `Hey ${name}!

Thanks for your interest in Rapid Solution. We're thrilled to have you on board!

Our team has received your details and one of our specialists will reach out to you within 24 hours to walk you through a personalized demo.

What happens next:
- Our team reviews your details
- We send you a personalized demo link
- You see exactly how to automate your growth

Got questions? Just reply to this email — we're here to help.

Cheers,
The Rapid Solution Team

© 2026 Rapid Solution. All rights reserved.`;
}

function buildEmailHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Rapid Solution</title>
</head>
<body style="margin:0;padding:0;background:#080b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8eaf0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080b14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0e1220;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff 0%,#a78bfa 100%);padding:40px 32px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">⚡</div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Welcome to Rapid Solution</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;">Hey ${escapeHtml(name)}! 🎉</h2>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#c4c9d4;">
                Thanks for your interest in <strong style="color:#a78bfa;">Rapid Solution</strong>. We're thrilled to have you on board!
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#c4c9d4;">
                Our team has received your details and one of our specialists will reach out to you within <strong style="color:#fff;">24 hours</strong> to walk you through a personalized demo.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141928;border-radius:12px;padding:24px;margin-bottom:28px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a78bfa;">What happens next</p>
                    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#e8eaf0;">✦ Our team reviews your details</p>
                    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#e8eaf0;">✦ We send you a personalized demo link</p>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#e8eaf0;">✦ You see exactly how to automate your growth</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#c4c9d4;">
                In the meantime, here's a preview of what's coming your way — auto posting, smart replies, hot lead detection, and a unified inbox across Facebook, Instagram, TikTok, and LinkedIn.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#c4c9d4;">
                Got questions? Just reply to this email — we're here to help.
              </p>

              <p style="margin:32px 0 0;font-size:15px;color:#c4c9d4;">
                Cheers,<br />
                <strong style="color:#fff;">The Rapid Solution Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#0a0d18;padding:24px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#8892a4;">© 2026 Rapid Solution. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
