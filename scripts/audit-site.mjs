import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const pages = [
  ['index.html', 'fr-CA', 'https://pbxmtl.ca/'],
  ['en/index.html', 'en-CA', 'https://pbxmtl.ca/en/'],
  ['tutoring-centres/index.html', 'fr-CA', 'https://pbxmtl.ca/tutoring-centres/'],
  ['en/tutoring-centres/index.html', 'en-CA', 'https://pbxmtl.ca/en/tutoring-centres/'],
  ['slot/index.html', 'fr-CA', 'https://pbxmtl.ca/slot/'],
  ['en/slot/index.html', 'en-CA', 'https://pbxmtl.ca/en/slot/'],
  ['confidentialite/index.html', 'fr-CA', 'https://pbxmtl.ca/confidentialite/'],
  ['en/privacy/index.html', 'en-CA', 'https://pbxmtl.ca/en/privacy/'],
  ['realisations/ramath-plus/index.html', 'fr-CA', 'https://pbxmtl.ca/realisations/ramath-plus/'],
  ['en/work/ramath-plus/index.html', 'en-CA', 'https://pbxmtl.ca/en/work/ramath-plus/'],
  ['liste-contenu/index.html', 'fr-CA', 'https://pbxmtl.ca/liste-contenu/'],
  ['en/content-checklist/index.html', 'en-CA', 'https://pbxmtl.ca/en/content-checklist/'],
  ['entente/index.html', 'fr-CA', 'https://pbxmtl.ca/entente/'],
  ['en/agreement/index.html', 'en-CA', 'https://pbxmtl.ca/en/agreement/']
];

const failures = [];
const count = (text, pattern) => (text.match(pattern) || []).length;
const check2 = (relative, condition, message) => {
  if (!condition) failures.push(`${relative}: ${message}`);
};

for (const [relative, language, canonical] of pages) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  const check = (condition, message) => {
    if (!condition) failures.push(`${relative}: ${message}`);
  };

  check(html.includes(`<html lang="${language}"`), `expected lang ${language}`);
  check(html.includes(`<link rel="canonical" href="${canonical}"`), 'canonical mismatch');
  check(count(html, /<link rel="alternate" hreflang=/g) === 3, 'expected three hreflang links');
  check(count(html, /<h1[ >]/g) === 1, 'expected one h1');
  check(count(html, /property="og:image"/g) === 1, 'expected one Open Graph image');
  check(count(html, /name="twitter:image"/g) === 1, 'expected one Twitter image');
  check(!/(cdn-cgi|modulepreload|\/_assets\/)/.test(html), 'contains a legacy runtime reference');
  check(html.includes('<main id="main-content"'), 'missing main landmark or skip target');

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch {
      check(false, 'invalid JSON-LD');
    }
  }

  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url.startsWith('/api/') || url === '/') continue;
    let target = path.join(root, url);
    if (url.endsWith('/')) target = path.join(target, 'index.html');
    check(fs.existsSync(target), `missing local target ${url}`);
  }
}

for (const required of ['robots.txt', 'sitemap.xml', '404.html', '_headers', '_redirects', 'assets/site.css', 'assets/site.js', 'assets/analytics.js', 'assets/pbxmtl-social.png', 'favicon.svg']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing ${required}`);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (count(sitemap, /<url>/g) !== 14) failures.push('sitemap: expected fourteen URLs');
if (count(sitemap, /hreflang=/g) !== 42) failures.push('sitemap: expected forty-two alternate links');
if (count(sitemap, /<lastmod>/g) !== 14) failures.push('sitemap: expected a lastmod on every URL');

/* Every indexable page must be in the sitemap, and every <loc> must exist locally. */
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const [relative, , canonical] of pages) {
  if (!sitemapLocs.includes(canonical)) failures.push(`sitemap: missing ${canonical} (${relative})`);
}
for (const loc of sitemapLocs) {
  const local = path.join(root, loc.replace('https://pbxmtl.ca', ''));
  const target = local.endsWith('/') || local === root ? path.join(local, 'index.html') : local;
  if (!fs.existsSync(target)) failures.push(`sitemap: ${loc} has no local file`);
}

/* The FAQ shown to visitors and the FAQPage structured data must agree. */
for (const relative of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  const schema = html.match(/\{"@type":"FAQPage","mainEntity\":[\s\S]*?\]\}/);
  if (!schema) { failures.push(`${relative}: missing FAQPage JSON-LD`); continue; }
  let parsed;
  try { parsed = JSON.parse(schema[0]); }
  catch { failures.push(`${relative}: FAQPage JSON-LD is not valid JSON`); continue; }
  const schemaQuestions = parsed.mainEntity.map((q) => q.name);
  const visible = [...html.matchAll(/<details><summary>([^<]+?)<span>\+<\/span><\/summary>/g)].map((m) => m[1]);
  check2(relative, schemaQuestions.length === visible.length,
    `FAQ schema has ${schemaQuestions.length} questions but the page shows ${visible.length}`);
  for (const name of schemaQuestions) {
    check2(relative, visible.includes(name), `FAQ question not visible on the page: "${name}"`);
  }
  check2(relative, schemaQuestions.length >= 9, `FAQ schema should carry at least nine questions, found ${schemaQuestions.length}`);
  check2(relative, parsed.mainEntity.every((q) => q.acceptedAnswer.text.length > 60),
    'every FAQ answer should carry real text, not a stub');
}

/* Every page must state a reachable owner and never a stray escape sequence. */
for (const [relative] of pages) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  check2(relative, html.includes('mailto:amitt.bhardwj@gmail.com'), 'missing a reachable owner email');
  check2(relative, !/\\/.test(html), 'contains a stray backslash escape');
}

/* Privacy + slot links must exist wherever the form is offered. */
for (const [relative] of pages.slice(0, 4)) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!/confidentialite\/|en\/privacy\//.test(html)) failures.push(`${relative}: missing privacy-policy link`);
  if (!/slot\//.test(html)) failures.push(`${relative}: missing slot/deposit link`);
  if (!html.includes('/assets/analytics.js')) failures.push(`${relative}: missing analytics loader`);
}

/* Each new page pair must cross-link: a language switch that points at its own
   page is a dead control, and the wrong hreflang misleads crawlers. */
const pairs = [
  ['index.html', 'https://pbxmtl.ca/en/'],
  ['en/index.html', 'https://pbxmtl.ca/'],
  ['slot/index.html', 'https://pbxmtl.ca/en/slot/'],
  ['en/slot/index.html', 'https://pbxmtl.ca/slot/'],
  ['confidentialite/index.html', 'https://pbxmtl.ca/en/privacy/'],
  ['en/privacy/index.html', 'https://pbxmtl.ca/confidentialite/'],
  ['realisations/ramath-plus/index.html', 'https://pbxmtl.ca/en/work/ramath-plus/'],
  ['en/work/ramath-plus/index.html', 'https://pbxmtl.ca/realisations/ramath-plus/'],
  ['liste-contenu/index.html', 'https://pbxmtl.ca/en/content-checklist/'],
  ['en/content-checklist/index.html', 'https://pbxmtl.ca/liste-contenu/'],
  ['entente/index.html', 'https://pbxmtl.ca/en/agreement/'],
  ['en/agreement/index.html', 'https://pbxmtl.ca/entente/']
];
for (const [relative, expected] of pairs) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  const match = html.match(/<a href="([^"]+)" class="language-button" hreflang="([^"]+)"/);
  if (!match) { failures.push(`${relative}: missing language switch`); continue; }
  /* Accept either the absolute URL or its root-relative equivalent: both land on the
     same page, and the homepages legitimately use the relative form. */
  const acceptable = [expected, expected.replace('https://pbxmtl.ca', '')];
  if (!acceptable.includes(match[1])) {
    failures.push(`${relative}: language switch points at ${match[1]}, expected ${expected}`);
  }
  const wantLang = relative.startsWith('en/') ? 'fr-CA' : 'en-CA';
  if (match[2] !== wantLang) failures.push(`${relative}: language switch hreflang is ${match[2]}, expected ${wantLang}`);
}

/* Fictional demo pages must not be indexed. */
for (const demo of ['exemples/index.html', 'exemples/peintre/index.html', 'en/examples/index.html', 'en/examples/painter/index.html']) {
  const html = fs.readFileSync(path.join(root, demo), 'utf8');
  if (!html.includes('name="robots" content="noindex, follow"')) failures.push(`${demo}: expected noindex, follow`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Static audit passed for fourteen bilingual pages.');
