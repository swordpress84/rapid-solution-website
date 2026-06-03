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
  return `Hi ${name},

Thanks for requesting a demo. We've received your details and one of our specialists will reach out within 24 hours to walk you through how Rapid Solution can help you.

Here's what happens next:
1. We review your details.
2. We send you a personalized demo link.
3. You see exactly how it works for your accounts.

If you have any questions, just reply to this email — it comes straight to our team.

Best regards,
The Rapid Solution Team

You received this email because you requested a demo at Rapid Solution.`;
}

function buildEmailHTML(name) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapid Solution</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1d24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e6e8eb;">
          <tr>
            <td style="padding:32px 36px;">

              <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#6c63ff;">Rapid Solution</p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1a1d24;">Hi ${escapeHtml(name)},</p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3a3f4a;">
                Thanks for requesting a demo. We've received your details and one of our specialists will reach out within 24 hours to walk you through how Rapid Solution can help you.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3a3f4a;">
                Here's what happens next:
              </p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#3a3f4a;">1. We review your details.</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#3a3f4a;">2. We send you a personalized demo link.</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#3a3f4a;">3. You see exactly how it works for your accounts.</p>

              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#3a3f4a;">
                If you have any questions, just reply to this email — it comes straight to our team.
              </p>

              <p style="margin:0;font-size:16px;line-height:1.6;color:#1a1d24;">
                Best regards,<br />
                The Rapid Solution Team
              </p>

              <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e6e8eb;font-size:13px;line-height:1.5;color:#8a909b;">
                You received this email because you requested a demo at Rapid Solution.
              </p>

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
