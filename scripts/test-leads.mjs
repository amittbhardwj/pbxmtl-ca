import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/leads.js';

const originalFetch = globalThis.fetch;
let delivered;
globalThis.fetch = async (url, init) => {
  delivered = { url, init, body: JSON.parse(init.body) };
  return new Response('{}', { status: 200 });
};

const env = {
  RESEND_API_KEY: 'test-key',
  CONTACT_TO_EMAIL: 'owner@example.com',
  CONTACT_FROM_EMAIL: 'PBXMTL <website@example.com>'
};

const validLead = {
  name: 'Test Person',
  business: 'Test Tutoring',
  email: 'person@example.com',
  website: 'https://example.com',
  need: 'Bilingual launch site',
  message: 'I need a clear bilingual website.',
  agreement: true,
  language: 'en'
};

const request = (body, method = 'POST') => new Request('https://preview.pages.dev/api/leads', {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: method === 'POST' ? JSON.stringify(body) : undefined
});

try {
  const success = await onRequest({ request: request(validLead), env });
  assert.equal(success.status, 200);
  assert.equal(delivered.url, 'https://api.resend.com/emails');
  assert.equal(delivered.body.reply_to, validLead.email);
  assert.match(delivered.body.text, /Test Tutoring/);

  const invalid = await onRequest({ request: request({ ...validLead, email: 'bad' }), env });
  assert.equal(invalid.status, 400);

  delivered = undefined;
  const bot = await onRequest({ request: request({ company_website: 'spam.example' }), env });
  assert.equal(bot.status, 200);
  assert.equal(delivered, undefined);

  const wrongMethod = await onRequest({ request: request({}, 'GET'), env });
  assert.equal(wrongMethod.status, 405);

  const foreignRequest = request(validLead);
  foreignRequest.headers.set('Origin', 'https://spam.example');
  const foreign = await onRequest({ request: foreignRequest, env });
  assert.equal(foreign.status, 403);

  const unconfigured = await onRequest({ request: request(validLead), env: {} });
  assert.equal(unconfigured.status, 503);

  console.log('Contact Function validation passed.');
} finally {
  globalThis.fetch = originalFetch;
}
