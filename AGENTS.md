# Bink - agent context

Bink is a Fresha-style salon booking marketplace on Supabase (Postgres + RLS +
Edge Functions), deployed to web (Vercel) and mobile (EAS / Expo Go).

## Layout: npm workspaces, two deployable apps

```
apps/public      customer + business surfaces. Mobile (Expo Go / EAS) and web.
                 Owns EAS project 39fc42fe-69c1-44f7-8313-e35019818482.
apps/admin       internal admin console. Web only, its own Vercel project and
                 its own origin, so none of it reaches the public bundle.
packages/shared  used by both: UI primitives, data layer, auth, i18n, theme,
                 brand assets. Imported as @bink/shared/lib/x, @bink/shared/components/x.
supabase/        migrations + edge functions (repo root, shared by both apps)
e2e/             security + smoke suites (repo root)
scripts/         seed generation and the bundle isolation check
```

Run from the repo root: `npm run web` (public), `npm run admin` (admin console),
`npm start` (public, with the Expo Go QR), `npm run typecheck` (all workspaces).

### The admin split is a security boundary, not a folder preference

The architecture review of 13 Aug 2026 found that admin.tsx shipped inside the
single public bundle, exposing table names, query shapes and admin routes to
every visitor. Two rules keep that fixed:

- **Admin-only reads and writes live in `apps/admin/src/lib/admin.ts`.** Never
  add them to `packages/shared` or `apps/public`, even when it looks convenient
  to reuse an existing module. If admin and customer code need the same query,
  ask first whether the customer genuinely needs it.
- **`npm run verify:isolation` must pass.** It builds both bundles and fails if
  an admin-only marker appears in the public one, with a positive control so a
  stale marker cannot make the check silently vacuous. CI runs it on every push.

The public app has no `/admin` route. Entry points call `openAdminConsole()`
from `@bink/shared/lib/admin-link`, which sends the user to
`EXPO_PUBLIC_ADMIN_URL`. Unset that variable and the entry points stay hidden.

## Expo SDK is pinned - do not upgrade

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. The project is pinned to **SDK 54** on purpose: it is the
newest SDK the App Store build of Expo Go can run. Do not upgrade the Expo SDK
without checking the store client first.

Metro config note: hierarchical lookup stays enabled in both apps. npm
workspaces hoist most packages to the root but leave some nested (expo-asset
under expo), and Metro has to walk up to find those. Disabling it is a pnpm
pattern and breaks this layout.

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
- **The service-role key stays server-side** - only inside `supabase/functions/*`,
  never in app code.
- **Webhooks re-verify.** `payments-webhook` re-fetches the charge from TAP
  before writing; never trust the webhook body.

## Money & messaging

- Payments go through TAP (`create-payment` -> hosted checkout -> `payments-webhook`
  settles escrow + issues the 15% VAT invoice; `refund-payment` calls the TAP
  refunds API). Gateway is `demo` until `TAP_SECRET_KEY` is set.
- SMS goes through Taqnyat (`send-sms`), which only messages the caller's own
  registered phone. No-op until `TAQNYAT_API_KEY` / `TAQNYAT_SENDER` are set.

## Working rules

- TypeScript `strict` is on across every workspace - keep it green (`npm run typecheck`).
- After editing files in `packages/shared`, restart Metro with `--clear` before
  verifying. Stale bundles get served repeatedly otherwise.
- Run `npm test` (the live RLS security suite) before shipping anything that
  touches policies, migrations, or auth.
- No em-dashes anywhere in code, strings, or docs - use a hyphen, comma or period.
