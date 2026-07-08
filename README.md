# Bink

Salon booking marketplace — hair salons, barbershops, nail studios, brows & lashes,
waxing, skincare, makeup and bridal salons. One Expo (React Native) codebase that ships:

- **Desktop website** (react-native-web, Fresha-style header/hero/footer layout)
- **Mobile website** (same responsive code below 1024px)
- **iOS / Android app** via Expo Go (bottom tabs, native-feeling screens)

Backend: **Supabase** (schema + seed managed with the Supabase CLI). Until a cloud
project is connected the app runs in **demo mode** — bundled data (same IDs as the
SQL seed) with bookings/favorites persisted locally, so everything works offline.

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
bookings/revenue in the dashboard. **Demo mode:** any email/password works; log
in with an email starting with `admin@` (e.g. `admin@bink.com`) for admin access.

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

## Connect cloud Supabase (when ready)

1. Free a project slot or upgrade, then:
   ```bash
   npx supabase projects create Bink --org-id <org> --db-password <pw> --region <region>
   npx supabase link --project-ref <ref>
   npx supabase db push                # applies migrations
   npx supabase db push --include-seed # pushes seed.sql too
   ```
2. Copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
3. Restart Expo. Auth, bookings and favorites switch to the cloud automatically
   (`src/lib/supabase.ts` + `src/lib/data.ts`).

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
