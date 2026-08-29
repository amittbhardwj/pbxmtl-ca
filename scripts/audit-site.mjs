import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const pages = [
  ['index.html', 'fr-CA', 'https://pbxmtl.ca/'],
  ['en/index.html', 'en-CA', 'https://pbxmtl.ca/en/'],
  ['tutoring-centres/index.html', 'fr-CA', 'https://pbxmtl.ca/tutoring-centres/'],
  ['en/tutoring-centres/index.html', 'en-CA', 'https://pbxmtl.ca/en/tutoring-centres/']
];

const failures = [];
const count = (text, pattern) => (text.match(pattern) || []).length;

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

for (const required of ['robots.txt', 'sitemap.xml', '404.html', '_headers', '_redirects', 'assets/site.css', 'assets/site.js', 'assets/pbxmtl-social.png', 'favicon.svg']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing ${required}`);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
if (count(sitemap, /<url>/g) !== 4) failures.push('sitemap: expected four URLs');
if (count(sitemap, /hreflang=/g) !== 12) failures.push('sitemap: expected twelve alternate links');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Static audit passed for four bilingual pages.');
