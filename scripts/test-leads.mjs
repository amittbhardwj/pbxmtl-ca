import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/leads.js';

const originalFetch = globalThis.fetch;
const calls = [];
let alertThrows = false;
let primaryThrows = false;
let delivered;                     // primary (owner-copy) call only — kept explicit
globalThis.fetch = async (url, init) => {
  const call = { url, init, body: JSON.parse(init.body) };
  calls.push(call);
  if (calls.length === 1) delivered = call;
  /* Reject on the alert call. A returned 500 would NOT exercise the try/catch in
     leads.js (it never inspects the alert Response), so only a thrown rejection
     from this mock can prove the guard works. */
  if (primaryThrows && calls.length === 1) throw new Error('simulated primary network failure');
  if (alertThrows && calls.length === 2) throw new Error('simulated network failure');
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

  /* Every accepted lead sends owner copy plus a clearly-labelled action alert. */
  assert.equal(calls.length, 2, 'expected exactly two Resend calls per accepted lead');
  assert.equal(calls[0].body.to[0], env.CONTACT_TO_EMAIL);
  assert.equal(calls[1].body.to[0], env.CONTACT_TO_EMAIL);
  assert.equal(calls[0].body.reply_to, validLead.email, 'owner copy replies to the lead');
  assert.equal(calls[1].body.reply_to, validLead.email, 'the alert replies to the lead too');
  assert.match(calls[1].body.subject, /^ACTION NEEDED/);
  assert.notEqual(calls[0].body.subject, calls[1].body.subject, 'the two emails must be distinguishable');
  assert.match(calls[1].body.text, /ACTION NEEDED/);
  assert.deepEqual(calls[0].body.to, calls[1].body.to);

  calls.length = 0;
  /* A thrown failure in the alert must never fail the visitor's submission.
     Remove the try/catch from leads.js and this assertion fails — that is its job. */
  calls.length = 0;
  alertThrows = true;
  const alertFails = await onRequest({ request: request(validLead), env });
  assert.equal(alertFails.status, 200, 'a rejected alert must not 5xx the visitor');
  assert.equal(JSON.parse(await alertFails.text()).ok, true);
  assert.equal(calls.length, 2, 'both attempts still happen when the alert is rejected');
  alertThrows = false;

  /* A rejected PRIMARY delivery must surface as 502, not an unhandled 500. */
  calls.length = 0;
  primaryThrows = true;
  const primaryFails = await onRequest({ request: request(validLead), env });
  assert.equal(primaryFails.status, 502, 'a rejected primary send must return 502');
  primaryThrows = false;

  calls.length = 0;
  const unconfigured = await onRequest({ request: request(validLead), env: {} });
  assert.equal(unconfigured.status, 503);
  assert.equal(calls.length, 0, 'no email may be attempted when delivery is unconfigured');

  /* A malformed Origin header must be rejected cleanly, not throw. */
  const malformed = request(validLead);
  malformed.headers.set('Origin', 'not a url');
  const malformedOrigin = await onRequest({ request: malformed, env });
  assert.equal(malformedOrigin.status, 403, 'a malformed Origin must be a clean 403');

  console.log('Contact Function validation passed.');
} finally {
  globalThis.fetch = originalFetch;
}
