import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const pages = [
  ['index.html', 'fr-CA', 'https://pbxmtl.ca/'],
  ['en/index.html', 'en-CA', 'https://pbxmtl.ca/en/'],
  ['realisations/ramath-plus/index.html', 'fr-CA', 'https://pbxmtl.ca/realisations/ramath-plus/'],
  ['en/work/ramath-plus/index.html', 'en-CA', 'https://pbxmtl.ca/en/work/ramath-plus/'],
  ['realisations/spin-and-snap/index.html', 'fr-CA', 'https://pbxmtl.ca/realisations/spin-and-snap/'],
  ['en/work/spin-and-snap/index.html', 'en-CA', 'https://pbxmtl.ca/en/work/spin-and-snap/'],
  ['entente/index.html', 'fr-CA', 'https://pbxmtl.ca/entente/'],
  ['en/agreement/index.html', 'en-CA', 'https://pbxmtl.ca/en/agreement/'],
  ['confidentialite/index.html', 'fr-CA', 'https://pbxmtl.ca/confidentialite/'],
  ['en/privacy/index.html', 'en-CA', 'https://pbxmtl.ca/en/privacy/']
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
if (count(sitemap, /<url>/g) !== pages.length) failures.push(`sitemap: expected ${pages.length} URLs`);
if (count(sitemap, /hreflang=/g) !== pages.length * 3) failures.push(`sitemap: expected ${pages.length * 3} alternate links`);
if (count(sitemap, /<lastmod>/g) !== pages.length) failures.push('sitemap: expected a lastmod on every URL');

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

/* Privacy + engagement-terms links must exist wherever the form is offered. */
for (const [relative] of pages.slice(0, 2)) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!/confidentialite\/|en\/privacy\//.test(html)) failures.push(`${relative}: missing privacy-policy link`);
  if (!/entente\/|en\/agreement\//.test(html)) failures.push(`${relative}: missing engagement-terms link`);
  if (!html.includes('data-lead-form')) failures.push(`${relative}: missing the contact form`);
  if (!html.includes('/assets/analytics.js')) failures.push(`${relative}: missing analytics loader`);
}

/* Each page pair must cross-link: a language switch that points at its own
   page is a dead control, and the wrong hreflang misleads crawlers. */
const pairs = [
  ['index.html', 'https://pbxmtl.ca/en/'],
  ['en/index.html', 'https://pbxmtl.ca/'],
  ['realisations/ramath-plus/index.html', 'https://pbxmtl.ca/en/work/ramath-plus/'],
  ['en/work/ramath-plus/index.html', 'https://pbxmtl.ca/realisations/ramath-plus/'],
  ['realisations/spin-and-snap/index.html', 'https://pbxmtl.ca/en/work/spin-and-snap/'],
  ['en/work/spin-and-snap/index.html', 'https://pbxmtl.ca/realisations/spin-and-snap/'],
  ['entente/index.html', 'https://pbxmtl.ca/en/agreement/'],
  ['en/agreement/index.html', 'https://pbxmtl.ca/entente/'],
  ['confidentialite/index.html', 'https://pbxmtl.ca/en/privacy/'],
  ['en/privacy/index.html', 'https://pbxmtl.ca/confidentialite/']
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

/* The retired $799-offer routes must 301 to a page that exists, and their old pages must be
   gone so the redirect, not a stale page, answers. */
const rules = fs.readFileSync(path.join(root, '_redirects'), 'utf8')
  .split('\n').map((line) => line.trim().split(/\s+/)).filter((rule) => rule.length === 3);
for (const source of ['/tutoring-centres/', '/en/tutoring-centres/', '/liste-contenu/', '/en/content-checklist/',
  '/slot/', '/en/slot/', '/exemples/', '/exemples/*', '/en/examples/', '/en/examples/*']) {
  const rule = rules.find((r) => r[0] === source);
  if (!rule || rule[2] !== '301') { failures.push(`_redirects: ${source} must be a 301`); continue; }
  const destination = rule[1].split('#')[0];
  const target = destination.endsWith('/') ? path.join(root, destination, 'index.html') : path.join(root, destination);
  if (!fs.existsSync(target)) failures.push(`_redirects: ${source} points at a missing page ${rule[1]}`);
  if (!source.endsWith('*') && fs.existsSync(path.join(root, source, 'index.html'))) {
    failures.push(`${source} is retired but its page still exists`);
  }
}

/* Whole-tree content guards. The old offer must not leak back; preview and operator hosts stay
   private; and in Québec "engineer"/"ingénieur" is a reserved professional title, so it may only
   appear as the name of the roles being sought, never as a self-description. */
const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.html')) htmlFiles.push(full);
  }
};
walk(root);
for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  if (/\$\s?799|799(?:\u00a0|&nbsp;|\s)?\$/.test(html)) failures.push(`${relative}: mentions the retired $799 offer`);
  if (/workers\.dev/.test(html)) failures.push(`${relative}: links a workers.dev preview or operator URL`);
  const withoutRoleName = html.replace(/Forward Deployed Engineer \(FDE\)/g, '');
  if (/\bengineer\b|ingénieur/i.test(withoutRoleName)) {
    failures.push(`${relative}: uses "engineer"/"ingénieur" outside the role name (reserved title in Québec)`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Static audit passed for ${pages.length} bilingual pages and ${htmlFiles.length} HTML files.`);
