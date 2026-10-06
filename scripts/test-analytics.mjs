import assert from 'node:assert/strict';

/* Minimal DOM stub — enough to load the real loader and observe its behaviour. */
const appended = [];
const clickHandlers = [];
const intentElement = {
  dataset: { pbxIntent: 'deposit_process' },
  addEventListener: (_type, fn) => clickHandlers.push(fn)
};

globalThis.window = globalThis;
globalThis.location = { hostname: 'pbxmtl.ca' };
globalThis.document = {
  readyState: 'complete',
  documentElement: { lang: 'fr-CA' },
  querySelector: () => null,
  querySelectorAll: (selector) => (selector === '[data-pbx-intent]' ? [intentElement] : []),
  createElement: () => ({ setAttribute() {} }),
  head: { appendChild: (el) => appended.push(el) },
  addEventListener: () => {}
};

await import('../public/assets/analytics.js');

/* 1. Disabled by default: the loader must request nothing at all. */
assert.equal(appended.length, 0, 'no tracker script may be injected while WEBSITE_ID is empty');
assert.equal(typeof window.pbxTrack, 'function', 'pbxTrack must be exposed for callers');

/* 2. Fail safe with no tracker present. */
assert.doesNotThrow(() => window.pbxTrack('probe', { a: 1 }));

/* 3. The real Umami shape is an OBJECT with a track() method. The loader must call
      it. A guard written as `typeof window.umami === 'function'` — the bug this
      test exists to prevent — would silently drop every event. */
const caught = [];
window.umami = { track: (name, data) => caught.push({ name, data }) };
window.pbxTrack('probe_event', { intent: 'probe' });
assert.equal(caught.length, 1, 'pbxTrack must dispatch through window.umami.track (object shape)');
assert.equal(caught[0].name, 'probe_event');

/* 4. The click delegate on [data-pbx-intent] must produce a slot_intent event
      carrying the offer name and the page language. */
assert.equal(clickHandlers.length > 0, true, 'intent links must be wired');
clickHandlers.forEach((fn) => fn());
const fromClick = caught[caught.length - 1];
assert.equal(fromClick.name, 'slot_intent');
assert.deepEqual(fromClick.data, { intent: 'deposit_process', language: 'fr-CA' });

/* 5. A tracker that is a bare function (never the real shape) must not throw. */
window.umami = () => { throw new Error('must not be invoked'); };
assert.doesNotThrow(() => window.pbxTrack('probe', {}));

console.log('Analytics loader contract passed.');
