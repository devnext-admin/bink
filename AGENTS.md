# Bink — agent context

Bink is a Fresha-style salon booking marketplace: one Expo Router app serving
customer, business (salon owner + team), and admin from a single routing tree,
on Supabase (Postgres + RLS + Edge Functions), deployed to web (Vercel) and
mobile (EAS / Expo Go).

## Expo SDK is pinned — do not upgrade

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. The project is pinned to **SDK 54** on purpose: it is the
newest SDK the App Store build of Expo Go can run. Do not upgrade the Expo SDK
without checking the store client first.

## Security invariants (never regress these)

- **Authorization lives in the database.** Every table has RLS enabled; the
  client is never trusted. When adding a table or column, add its policies in
  the same migration.
- **Roles are locked.** A `BEFORE UPDATE` trigger on `profiles`
  (`lock_profile_privileges`) pins `role` and `is_blocked` for anyone who is not
  already an admin. Never remove it; never add a policy that lets a user set
  their own role. Covered by `e2e/security.test.mjs`.
- **No double-booking.** An exclusion constraint (`no_double_booking`) rejects
  overlapping active bookings per staff member at the database level. Keep it.
- **The service-role key stays server-side** — only inside `supabase/functions/*`,
  never in app code.
- **Webhooks re-verify.** `payments-webhook` re-fetches the charge from TAP
  before writing; never trust the webhook body.

## Money & messaging

- Payments go through TAP (`create-payment` → hosted checkout → `payments-webhook`
  settles escrow + issues the 15% VAT invoice; `refund-payment` calls the TAP
  refunds API). Gateway is `demo` until `TAP_SECRET_KEY` is set.
- SMS goes through Taqnyat (`send-sms`), which only messages the caller's own
  registered phone. No-op until `TAQNYAT_API_KEY` / `TAQNYAT_SENDER` are set.

## Working rules

- TypeScript `strict` is on for the whole codebase — keep it green (`npm run typecheck`).
- After editing lib files, restart Metro with `--clear` before verifying (stale
  bundles served repeatedly otherwise). Dev server runs on port **8083**.
- Run `npm test` (the live RLS security suite) before shipping anything that
  touches policies, migrations, or auth.
- No em-dashes anywhere in code, strings, or docs — use a hyphen, comma or period.
