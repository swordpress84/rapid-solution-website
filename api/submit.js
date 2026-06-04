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
        subject: `Thanks for your demo request, ${name}`,
        text: buildEmailText(name),   // plain-text ONLY — looks human, better inbox placement
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
  return `Hi ${name},

Thanks for requesting a demo of Rapid Solution. I've got your details and someone from our team will reach out within 24 hours to set up your personalized walkthrough.

If you have any questions in the meantime, just reply to this email — it comes straight to us.

Talk soon,
The Rapid Solution Team`;
}

