#!/usr/bin/env bash
# Archive the native Bink app, sign it on the devnext Apple team with cloud
# managed signing (no local certificate needed) and upload it to App Store
# Connect. Needs an App Store Connect API key with the Admin or App Manager
# role, created at appstoreconnect.apple.com -> Users and Access ->
# Integrations -> App Store Connect API -> Team Keys.
#
#   DEVNEXT_ASC_KEY_ID=ABC123DEF4 DEVNEXT_ASC_ISSUER_ID=<uuid> \
#   DEVNEXT_APPLE_TEAM_ID=<10 chars> ./scripts/ios-appstore.sh 1
#
# The argument is the build number, which must increase on every upload.
# The .p8 file is read from ~/Desktop/devnext-signing/AuthKey_<KEY_ID>.p8.
# Run `npx expo prebuild -p ios` in apps/public and `pod install` first.
set -euo pipefail
BUILD="${1:?usage: ios-appstore.sh <build-number>}"
KID="${DEVNEXT_ASC_KEY_ID:?set DEVNEXT_ASC_KEY_ID}"
ISS="${DEVNEXT_ASC_ISSUER_ID:?set DEVNEXT_ASC_ISSUER_ID}"
TEAM="${DEVNEXT_APPLE_TEAM_ID:?set DEVNEXT_APPLE_TEAM_ID}"
KEY="${DEVNEXT_ASC_KEY_PATH:-$HOME/Desktop/devnext-signing/AuthKey_$KID.p8}"
[ -f "$KEY" ] || { echo "API key file not found: $KEY" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/apps/public/ios"
OUT="$ROOT/.deploy/ios"
rm -rf "$OUT" && mkdir -p "$OUT"
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$KID" -authenticationKeyIssuerID "$ISS")

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>$TEAM</string>
  <key>uploadSymbols</key><true/>
</dict></plist>
PLIST

echo "== Archiving build $BUILD"
xcodebuild archive \
  -workspace "$IOS/Bink.xcworkspace" -scheme Bink -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$OUT/Bink.xcarchive" \
  -derivedDataPath "$OUT/DerivedData" -jobs "${XCODE_JOBS:-2}" \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic CURRENT_PROJECT_VERSION="$BUILD" \
  "${AUTH[@]}" 2>&1 | grep -E 'error:|warning: .*sign|ARCHIVE (SUCCEEDED|FAILED)'

echo "== Exporting IPA"
xcodebuild -exportArchive -archivePath "$OUT/Bink.xcarchive" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" -exportPath "$OUT/export" \
  "${AUTH[@]}" 2>&1 | grep -E 'error:|EXPORT (SUCCEEDED|FAILED)'

echo "== Uploading to App Store Connect"
mkdir -p "$HOME/.appstoreconnect/private_keys"
cp -n "$KEY" "$HOME/.appstoreconnect/private_keys/" 2>/dev/null || true
xcrun altool --upload-app -f "$OUT/export/Bink.ipa" -t ios --apiKey "$KID" --apiIssuer "$ISS"
echo "Uploaded build $BUILD. Processing takes 10-30 minutes; then attach it to the 1.0 version in App Store Connect."
