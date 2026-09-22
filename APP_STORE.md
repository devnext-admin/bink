# Bink - App Store submission pack

Everything App Store Connect asks for, ready to paste. Bundle id `sa.devnext.bink`,
version 1.0.0, build 1. Native project: `npx expo prebuild -p ios` in `apps/public`
(the generated `apps/public/ios` folder is git-ignored).

## App information

| Field | Value |
| --- | --- |
| Name | Bink |
| Subtitle | Book salons, barbers and spas |
| Primary category | Lifestyle |
| Secondary category | Health & Fitness |
| Age rating | 4+ (no objectionable content, no unrestricted web access) |
| Support URL | https://bink-seven.vercel.app/support |
| Privacy policy URL | https://bink-seven.vercel.app/privacy |
| Marketing URL | https://bink-seven.vercel.app |
| Copyright | 2026 Bink |
| Export compliance | `ITSAppUsesNonExemptEncryption = false` is set in app.json, no questions asked at upload |

## Description

Bink is the easiest way to book beauty and grooming appointments in Saudi Arabia.
Browse hair salons, barbershops, nail studios, brow and lash bars, waxing, skincare,
makeup and bridal specialists near you, compare services and prices, pick a time
that suits you and book in seconds.

- Discover salons near you and sort by distance, rating or price
- See real availability and book the exact slot you want
- Pay securely in the app; your payment is held until your visit is confirmed
- Manage, reschedule or cancel appointments from one place
- Message the salon directly and get reminders before every visit
- Save favourites and leave reviews after your appointment
- Salon owners: register your business, manage your team, calendar, sales and
  client messages from the same app
- Available in English and Arabic

## Keywords

salon,barber,booking,beauty,nails,spa,haircut,appointment,riyadh,saudi,fresha

## What's new (1.0.0)

First release of Bink: discover and book salons, barbers and spas near you.

## App Review information

Sign-in required: yes. Use the demo customer account below. The demo salon owner
account shows the business side (dashboard, calendar, team, sales).

| Role | Email | Password |
| --- | --- | --- |
| Customer | demo@bink.com | binkdemo123 |
| Salon owner | owner@bink.com | binkdemo123 |

Notes for the reviewer:

> Bink is a marketplace for booking beauty and grooming appointments at physical
> salons in Saudi Arabia. Payments run through a demo gateway in this build, so
> the checkout completes without charging a real card. Location is optional and
> only used to sort nearby salons. Accounts can be deleted from Settings > Delete
> account. The native app signs in with email and password or as a guest; no
> third-party login is offered on iOS.

Contact: first name, last name, phone and email of the account holder (fill in
App Store Connect).

## App Privacy (nutrition label)

Data linked to the user, used for app functionality only, no tracking:

- Contact info: name, email address, phone number
- Location: precise location (only while using the app, to sort nearby salons)
- User content: messages to salons, reviews, photos are not collected
- Purchases: purchase history (bookings and payments)
- Identifiers: user ID

## Screenshots

`apps/public/store/screenshots/` holds Release-build captures from the iPhone
17 Pro simulator (1206 x 2622) and, under `6.9-inch/`, the same frames resampled
to 1320 x 2868 for the required iPhone 6.9" slot (home, venue, appointments).
No iPad set is needed because `supportsTablet` is false.

## Build and upload

The archive is signed manually with a distribution certificate and an App Store
provisioning profile for `sa.devnext.bink` on the Apple team that owns the app
record. Then:

```bash
cd apps/public/ios
xcodebuild archive -workspace Bink.xcworkspace -scheme Bink -configuration Release \
  -destination 'generic/platform=iOS' -archivePath ../../../.deploy/ios/Bink.xcarchive \
  -allowProvisioningUpdates -authenticationKeyPath <AuthKey.p8> \
  -authenticationKeyID <KEY_ID> -authenticationKeyIssuerID <ISSUER_ID>
xcodebuild -exportArchive -archivePath ../../../.deploy/ios/Bink.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath ../../../.deploy/ios/export \
  -allowProvisioningUpdates -authenticationKeyPath <AuthKey.p8> \
  -authenticationKeyID <KEY_ID> -authenticationKeyIssuerID <ISSUER_ID>
xcrun altool --upload-app -f ../../../.deploy/ios/export/Bink.ipa -t ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
```

Build numbers must increase on every upload (`ios.buildNumber` in app.json).
