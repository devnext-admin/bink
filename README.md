# Bink

Salon booking marketplace — hair salons, barbershops, nail studios, brows & lashes,
waxing, skincare, makeup and bridal salons. One Expo (React Native) codebase that ships:

- **Desktop website** (react-native-web, Fresha-style header/hero/footer layout)
- **Mobile website** (same responsive code below 1024px)
- **iOS / Android app** via Expo Go (bottom tabs, native-feeling screens)

Backend: **cloud Supabase** (project `Bink` in the ThreeLines org, region
eu-central-1; schema + seed managed with the Supabase CLI). Auth, bookings,
messaging, payments/escrow and notifications all run on the live database.
Without `.env` credentials the app falls back to **demo mode** — bundled data
with everything persisted locally.

## Run it

```bash
npm install
npm run web        # desktop + mobile web on http://localhost:8081
npm start          # then scan the QR code with Expo Go for the native app
```

## Roles & portals

| Area | Route | Who |
| --- | --- | --- |
| Marketplace (book treatments) | `/`, `/search`, `/venue/…`, `/booking/…` | everyone |
| Account (sign up / appointments / favorites) | `/auth`, `/profile`, `/appointments` | customers |
| Bink for Business (register salon + dashboard) | `/business`, `/business/dashboard` | partners |
| Internal admin (stats, salons, users, bookings) | `/admin` | Bink team |

New salons are created as **pending** and only appear in the marketplace after an
admin approves them. Partners manage services, team, settings and see their
bookings/revenue in the dashboard.

**Demo accounts** (cloud, password `binkdemo123`, one-click buttons on `/auth`):

| Persona | Email | Lands on |
| --- | --- | --- |
| Customer (Deema) | `demo@bink.com` | Appointments with escrow states, chat, invoices, favorites |
| Salon owner (Lama) | `owner@bink.com` | Glow & Co dashboard: bookings, sales, messages |
| Admin | `admin@bink.com` | Platform stats, approvals, users |

Demo persona data lives in `supabase/demo-personas.sql`.

## Design system

Extracted from Fresha's live site: ink `#0D0D0D` on white, violet accent `#6950F3`,
star yellow `#FFC00A`, grays `#767676 / #D3D3D3 / #F2F2F2`, pill buttons (999px),
cards 8–16px radius, pastel violet hero gradient, Manrope typeface.
Tokens live in `src/lib/theme.ts`. Reference screenshots in `design-refs/`.

## Structure

```
src/
  app/                expo-router routes (index, search, venue/[slug], booking/[slug],
                      appointments, profile, auth)
  screens/            desktop vs mobile home implementations
  components/         VenueCard, SectionRail, SearchBar, ServiceRow, BottomTabs, ...
  lib/                theme, types, data layer, auth/booking/app-data contexts
  data/demo.json      generated demo dataset (mirrors supabase/seed.sql)
scripts/
  data.mjs            canonical seed data (12 venues, services, staff, reviews)
  generate-seed.mjs   regenerates supabase/seed.sql + src/data/demo.json
supabase/
  migrations/         full schema: venues, services, staff, bookings, reviews,
                      favorites, opening hours — with RLS policies + triggers
  seed.sql            generated seed
```

## Payments (Moyasar-ready)

The money layer is fully built: checkout offers **pay at venue / card / Apple Pay**,
successful charges create a row in `transactions`, issue a **15% VAT tax invoice**,
and mark the booking paid. Venues get a real **Sales** tab (gross / refunds / net +
transaction list) with one-click **refunds**; customers get an **Invoices** screen;
admin sees paid-online volume and per-booking payment status.

Out of the box it runs on a simulated gateway (`EXPO_PUBLIC_PAYMENTS_GATEWAY=demo`)
— no keys needed, no real charges.

### Escrow

Online payments follow a marketplace escrow model (migration
`20260709000006_escrow.sql`): the charge is captured immediately but **held**
by Bink. Release requires **both parties** — the salon marks the booking
completed AND the customer taps "Confirm visit" — after which the transaction
flips to `released` (with `released_at`), both sides are notified, and the
amount moves from "In escrow" to "Released to you" in the salon's Sales tab.
Refunds before release return the held funds to the customer. On cloud
Supabase the release check runs in the `try_release_escrow` SQL function so
neither client can force a release unilaterally. With Moyasar, funds settle
into the Bink merchant account; the released ledger is the salons' payout
basis (bank payouts are an ops process on top of this ledger).

### Activate real payments (once you have Moyasar keys)

```bash
# 1. Deploy the edge functions (cloud Supabase project required)
npx supabase functions deploy create-payment
npx supabase functions deploy payments-webhook --no-verify-jwt
npx supabase functions deploy refund-payment

# 2. Set the secrets
npx supabase secrets set MOYASAR_SECRET_KEY=sk_live_... \
  MOYASAR_WEBHOOK_TOKEN=<shared-token> \
  APP_URL=https://bink-three.vercel.app

# 3. Point the Moyasar dashboard webhook at:
#    https://<ref>.functions.supabase.co/payments-webhook

# 4. Flip the app to the real gateway in .env
EXPO_PUBLIC_PAYMENTS_GATEWAY=moyasar
```

The flow: client invokes `create-payment` (validates booking ownership + amount
server-side, creates the Moyasar payment, records a pending transaction) → 3DS
redirect if required → `payments-webhook` settles the transaction, marks the
booking paid and issues the invoice. Refunds go through `refund-payment`
(venue-owner/admin only). Tap can be swapped in later behind the same functions.

## Team accounts

Salon owners add team members under **Team** with an email, an access level
(**Manager** sees everything; **Team member** sees only their own bookings,
messages and services) and the services they provide. "Email invite" sends a
Supabase invite email; the link lands on `/welcome` where the member sets a
password (edge function `invite-team-member`). Note: Supabase's built-in
SMTP is rate-limited (a few emails/hour) — configure custom SMTP in the
dashboard for production volumes.

## Cloud Supabase

Live project: `yxidiwkswariavopixmf` (ThreeLines org, eu-central-1). `.env`
(gitignored) carries `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
— copy from `.env.example` and fill from the dashboard's API settings if you're
setting up a new machine.

```bash
npx supabase link --project-ref yxidiwkswariavopixmf   # once per machine
npx supabase db push                                   # apply new migrations
```

To rebuild from scratch: create a project, `db push`, run `supabase/seed.sql`,
create the demo auth users (emails above, password `binkdemo123`) via the auth
admin API, update the UUIDs at the top of `supabase/demo-personas.sql`, and run
it. Email confirmations are disabled (`mailer_autoconfirm`) so signups get an
instant session.

## Deploy web to Vercel

Live at **https://bink-three.vercel.app** (Vercel project `bink`).

```bash
npx expo export --platform web                 # SPA build → dist/ (web.output = "single")
printf '{\n  "version": 2,\n  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]\n}\n' > dist/vercel.json
npx vercel link --cwd dist --project bink --yes
npx vercel deploy --cwd dist --prod --yes
```

Note: fonts (Manrope + Ionicons) are bundled from `assets/fonts/` and registered in
`src/app/_layout.tsx` — the Vercel CLI strips any `node_modules` path from uploads,
so package-path font assets would 404 in production.
