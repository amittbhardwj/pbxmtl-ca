const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const clean = (value, limit) => String(value || '').trim().slice(0, limit);
const cleanLine = (value, limit) => clean(value, limit).replace(/[\r\n]+/g, ' ');

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const origin = request.headers.get('origin');
  if (origin) {
    /* A malformed Origin must be rejected, not thrown on. */
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === new URL(request.url).host;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) return json({ ok: false, error: 'Origin not allowed.' }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 20_000) return json({ ok: false, error: 'Payload too large.' }, 413);

  let input;
  try {
    if ((request.headers.get('content-type') || '').includes('application/json')) {
      input = await request.json();
    } else {
      input = Object.fromEntries(await request.formData());
    }
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  if (clean(input.company_website, 200)) return json({ ok: true });

  const lead = {
    name: cleanLine(input.name, 120),
    business: cleanLine(input.business, 160),
    email: clean(input.email, 254),
    website: clean(input.website, 500),
    need: cleanLine(input.need, 200),
    message: clean(input.message, 3000),
    language: input.language === 'en' ? 'en' : 'fr'
  };

  const agreed = input.agreement === true || input.agreement === 'true' || input.agreement === 'on';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  if (!lead.name || !lead.business || !validEmail || !lead.need || !lead.message || !agreed) {
    return json({ ok: false, error: 'Required fields are missing or invalid.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    return json({ ok: false, error: 'Contact delivery is not configured.' }, 503);
  }

  const lines = [
    'New PBXMTL website lead',
    '',
    `Name: ${lead.name}`,
    `Business: ${lead.business}`,
    `Email: ${lead.email}`,
    `Website: ${lead.website || 'Not provided'}`,
    `Need: ${lead.need}`,
    `Language: ${lead.language}`,
    '',
    'Message:',
    lead.message
  ];

  let delivery;
  try {
    delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: lead.email,
        subject: `PBXMTL lead — ${lead.business}`,
        text: lines.join('\n')
      })
    });
  } catch (error) {
    /* A network-level rejection must surface as the documented 502, not a raw 500. */
    console.error('Lead delivery request failed', error);
    return json({ ok: false, error: 'Delivery failed.' }, 502);
  }

  if (!delivery.ok) {
    console.error('Lead delivery failed', delivery.status, await delivery.text());
    return json({ ok: false, error: 'Delivery failed.' }, 502);
  }

  /* Best-effort: put the lead in front of whoever runs the site, so it is not
     lost if the main inbox is missed. A failure here never fails the request. */
  try {
    const alertSubject = `ACTION NEEDED — new PBXMTL lead: ${lead.business}`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: lead.email,
        subject: alertSubject,
        text: `ACTION NEEDED — a new website inquiry is waiting.\n\nReply to this email and the answer goes straight back to ${lead.email}.\n\n${lines.join('\n')}`
      })
    });
  } catch (error) {
    console.error('Lead alert email failed', error);
  }

  return json({ ok: true });
}
