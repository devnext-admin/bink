# Bink production go-live runbook

Everything below is already coded, deployed and inert until its key is set.
No code changes are needed on launch day - only keys and one env flip.

## 1. TAP payments (os.tap.company)

1. In the TAP dashboard open goSell -> API Credentials and copy the
   **live secret key** (`sk_live_...`).
2. Set it on the edge functions:

   ```bash
   npx supabase secrets set TAP_SECRET_KEY=sk_live_XXXX --project-ref cmvdudcyubhqdoeeppky
   ```

3. Flip the app to the live gateway: change `EXPO_PUBLIC_PAYMENTS_GATEWAY`
   from `demo` to `tap` in `.env`, in the EAS production environment
   (expo.dev -> bink -> Environment variables), and redeploy web + publish an
   EAS update.

Flow: `create-payment` creates the TAP charge and returns the hosted page
(card, mada, Apple Pay); `payments-webhook` verifies the charge against
TAP's API and settles the transaction (escrow held, booking paid, VAT
invoice, notifications); `refund-payment` refunds through TAP on
cancellation or from the admin Payments tab.

Test first with the TAP **test** secret key (`sk_test_...`) and TAP's test
cards before switching to live.

## 2. Taqnyat SMS (portal.taqnyat.sa)

1. In the Taqnyat portal copy the **API key** (bearer token) and the approved
   **sender name**.
2. Set both:

   ```bash
   npx supabase secrets set TAQNYAT_API_KEY=XXXX TAQNYAT_SENDER=Bink --project-ref cmvdudcyubhqdoeeppky
   ```

That is all - the app already sends booking confirmation, reschedule and
cancellation SMS to the customer's registered phone the moment the key
exists. The `send-sms` function only ever messages the authenticated
caller's own number.

## 3. iOS App Store (developer.apple.com)

The project is build-ready: bundle id `sa.devnext.bink`, `eas.json`
production profile, icons, splash and permission strings are all in place.
The repo is not bound to any EAS project yet, so link it to your Expo
account first, then build. Apple requires the account holder to
authenticate, so run:

```bash
npx eas-cli init                                        # once, links your Expo account
npx eas-cli build --platform ios --profile production
```

and sign in with the Apple Developer account when prompted (EAS handles
certificates and provisioning automatically). Then:

```bash
npx eas-cli submit --platform ios
```

to push the build to TestFlight / App Store Connect. Android is the same
with `--platform android` (needs a Google Play service account or manual
upload of the `.aab`).

## 4. Already done (no action)

- Real Supabase auth only, password recovery flow live
- Edge functions deployed: create-payment, payments-webhook (TAP-verified),
  refund-payment, send-sms, register-venue, invite-team-member
- `APP_URL` secret set to https://bink-seven.vercel.app
- Escrow, VAT invoices, notifications wired to the webhook
- Cloud database migrated through 20260729000021

## Security note

The credentials document that was shared for these services contains
portal passwords. Only the API keys above are needed by the app; the
passwords themselves should be rotated after setup and never stored in the
repository.
