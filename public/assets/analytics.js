/*
 * PBX MTL — privacy-friendly analytics loader.
 *
 * Configuration (one of two supported setups):
 *   A. Self-hosted Umami served from THIS origin (recommended here).
 *      Its script is fetched from SCRIPT_SRC and reports back to HOST_URL.
 *      Both are same-origin, so the site's strict CSP in public/_headers
 *      (script-src 'self' 'unsafe-inline'; connect-src 'self') needs no change at all.
 *   B. Hosted Umami Cloud. Its tracker reports to https://gateway.umami.is,
 *      which connect-src 'self' BLOCKS. Using the hosted service requires
 *      adding that origin to connect-src, or proxying it same-origin.
 *      Do not set WEBSITE_ID for the hosted service without doing one of those.
 *
 * Leave WEBSITE_ID empty to ship this disabled; nothing is requested or sent.
 */
(() => {
  const WEBSITE_ID = '';
  const SCRIPT_SRC = '/assets/umami.js';
  const HOST_URL = '';

  /* Umami exposes window.umami as an OBJECT with a track() method,
     so the presence check must be on the method, not on window.umami itself. */
  const send = (name, data) => {
    const tracker = window.umami;
    if (tracker && typeof tracker.track === 'function') tracker.track(name, data);
  };
  window.pbxTrack = send;

  const mount = () => {
    if (!WEBSITE_ID) return;
    if (document.querySelector('script[data-pbx-analytics]')) return;
    const tag = document.createElement('script');
    tag.defer = true;
    tag.src = SCRIPT_SRC;
    tag.setAttribute('data-website-id', WEBSITE_ID);
    tag.setAttribute('data-auto-track', 'true');
    tag.setAttribute('data-do-not-track', 'true');
    tag.setAttribute('data-domains', location.hostname);
    if (HOST_URL) tag.setAttribute('data-host-url', HOST_URL);
    tag.setAttribute('data-pbx-analytics', '');
    document.head.appendChild(tag);
  };

  /* The deposit is confirmed by email, so the slot page is the real conversion.
     Record which offer a visitor was reading when they took that path. */
  const trackIntent = () => {
    document.querySelectorAll('[data-pbx-intent]').forEach((link) => {
      link.addEventListener('click', () => {
        send('slot_intent', {
          intent: link.dataset.pbxIntent,
          language: document.documentElement.lang
        });
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mount(); trackIntent(); });
  } else {
    mount(); trackIntent();
  }
})();
