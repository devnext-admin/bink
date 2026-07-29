// Injects SEO + Open Graph/Twitter meta into the exported SPA shell.
// Expo Router's single-page output ships a bare <title>Bink</title>; this adds
// the description and social-preview tags crawlers and link scrapers read.
// Run after `expo export`: node scripts/inject-meta.mjs
import fs from 'node:fs';

const FILE = 'dist/index.html';
const DESCRIPTION =
  'Bink is Saudi Arabia’s salon booking marketplace - discover hair, nails, barber, brows, lashes, waxing, skincare and makeup professionals near you and book in seconds.';
const TITLE = 'Bink - Book salons, barbers & beauty in Saudi Arabia';
const URL = 'https://bink-three.vercel.app';
const IMAGE = `${URL}/favicon.png`;

const tags = `
    <title>${TITLE}</title>
    <meta name="description" content="${DESCRIPTION}" />
    <meta name="theme-color" content="#FF385C" />
    <link rel="canonical" href="${URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Bink" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${URL}" />
    <meta property="og:image" content="${IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
    <meta name="twitter:image" content="${IMAGE}" />`;

let html = fs.readFileSync(FILE, 'utf8');
html = html.replace('<title>Bink</title>', tags.trim());
fs.writeFileSync(FILE, html);
console.log('Injected SEO meta into', FILE);
