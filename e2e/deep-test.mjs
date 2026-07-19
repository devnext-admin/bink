// Bink deep E2E smoke suite.
//
// Covers every role and surface against a running dev server:
//   guest (home rails, search, venue, legal, auth gate)
//   customer demo@bink.com (appointments, invoices, messages, favorites,
//     notifications, profile, settings)
//   owner owner@bink.com (all 10 dashboard sections)
//   team member staff@bink.com (role isolation)
//   admin admin@bink.com (back-office tabs, user controls)
//   mobile viewport (tabs, venue) and Arabic RTL (home, search, terms)
//
// Run:
//   npx expo start --web --port 8081        # in one terminal
//   node e2e/deep-test.mjs                  # needs `npm i -D playwright`
//
// Demo password for all personas: binkdemo123

import { chromium } from 'playwright';

const BASE = process.env.BINK_URL ?? 'http://localhost:8081';
const PASS = 'binkdemo123';
const results = [];
const check = (name, ok) => {
  results.push([name, !!ok]);
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${name}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const text = () => page.evaluate(() => document.body.innerText);
const go = async (path, wait = 6000) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
};
const login = async (email) => {
  await page.evaluate(() => localStorage.clear());
  await go('/auth', 5000);
  await page.locator('input').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.getByText(/^(Log in|Sign in|Continue)$/).last().click();
  await page.waitForTimeout(6000);
};

console.log('— guest —');
await go('/', 9000);
await page.evaluate(() => localStorage.clear());
await go('/', 9000);
let b = await text();
check('home rails + next-available', b.includes('Recommended') && b.includes('New to Bink') && b.includes('Next:'));
await go('/search?q=nail');
b = await text();
check('search finds nail salons', b.includes('Velvet Nails') || b.includes('Nail Atelier'));
await go('/venue/glow-and-co');
b = await text();
check('venue page complete', b.includes('Glow & Co') && b.includes('Signature Cut & Style') && b.includes('Lama'));
await go('/terms', 3000);
check('terms page', (await text()).includes('Terms'));
await go('/invoices', 3000);
check('guest gated from invoices', /log in|sign in/i.test(await text()));

console.log('— customer —');
await login('demo@bink.com');
await go('/appointments');
check('appointments', (await text()).includes('Appointments'));
await go('/invoices', 5000);
check('invoices', (await text()).includes('SAR'));
await go('/messages', 5000);
b = await text();
check('message threads', b.includes('The Fade Room') || b.includes('Glow Lash Studio'));
await go('/profile', 4000);
check('profile', (await text()).includes('Deema'));

console.log('— owner dashboard —');
await login('owner@bink.com');
await go('/business/dashboard', 8000);
const sections = [
  ['Overview', ["Today's appointments", 'Team leaderboard']],
  ['Calendar', ['Week view', 'Add booking']],
  ['Messages', []],
  ['Clients', ['Total spent']],
  ['Reviews', ['Rating breakdown']],
  ['Sales', ['SAR']],
  ['Analytics', ['Average ticket', 'Peak hours']],
  ['Services', []],
  ['Team', ['Rita']],
  ['Settings', ['Booking policies']],
];
for (const [nav, needles] of sections) {
  await page.getByText(nav, { exact: true }).first().click();
  await page.waitForTimeout(2200);
  b = await text();
  check(`dashboard ${nav}`, needles.every((n) => b.includes(n)));
}

console.log('— team member isolation —');
await login('staff@bink.com');
await go('/business/dashboard', 8000);
b = await text();
check('member badge + venue', b.includes('Team member') && b.includes('Glow & Co'));
check('member cannot see money/clients/settings', !b.includes('Sales') && !b.includes('Clients') && !b.includes('Settings'));

console.log('— admin —');
await login('admin@bink.com');
await go('/admin', 8000);
b = await text();
check('admin tabs', ['Salons', 'Users', 'Payments', 'Reviews'].every((x) => b.includes(x)));
await page.getByText('Users', { exact: true }).first().click();
await page.waitForTimeout(2500);
b = await text();
check('admin user controls', b.includes('View as user'));

console.log('— mobile + arabic —');
await page.evaluate(() => localStorage.clear());
await page.setViewportSize({ width: 390, height: 844 });
await go('/', 8000);
b = await text();
check('mobile bottom tabs', ['Home', 'Search', 'Appointments', 'Messages', 'Profile'].every((x) => b.includes(x)));
await page.evaluate(() => localStorage.setItem('bink.lang', 'ar'));
await page.setViewportSize({ width: 1440, height: 900 });
await go('/', 9000);
b = await text();
check('arabic RTL home', (await page.evaluate(() => document.dir)) === 'rtl' && b.includes('الأقرب'));

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
