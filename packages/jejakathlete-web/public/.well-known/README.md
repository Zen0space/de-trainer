# Universal Links Configuration

This directory contains configuration files for iOS Universal Links and Android App Links.

## apple-app-site-association (iOS)

This file enables iOS Universal Links for the mobile app.

### Configuration Required:

Replace `TEAM_ID` in the file with your actual Apple Team ID:
- Find your Team ID in the Apple Developer Portal
- Or run: `security find-certificate -c "Apple Development" -p | openssl x509 -text | grep "OU="`

**Current placeholder:** `TEAM_ID.com.zen0team.detrainer`
**Should be:** `YOUR_TEAM_ID.com.zen0team.detrainer`

### Verification:

After deploying, verify the file is accessible at:
```
https://jejak-athlete.vercel.app/.well-known/apple-app-site-association
```

The file must:
- Be served with `Content-Type: application/json` or `application/pkcs7-mime`
- Be accessible without redirects
- Not require authentication

### Testing:

Use Apple's validator:
```
https://search.developer.apple.com/appsearch-validation-tool/
```

## assetlinks.json (Android)

This file enables Android App Links for the mobile app.

### Configuration Required:

Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with your app's SHA-256 certificate fingerprint.

#### For Debug Builds:

```bash
cd packages/jejakathlete-mobile/android
./gradlew signingReport
```

Look for the SHA-256 fingerprint under the `debug` variant.

#### For Release Builds:

```bash
keytool -list -v -keystore YOUR_KEYSTORE.jks -alias YOUR_ALIAS
```

Or if using Google Play App Signing, get the fingerprint from:
- Google Play Console → Release → Setup → App Integrity → App Signing

### Verification:

After deploying, verify the file is accessible at:
```
https://jejak-athlete.vercel.app/.well-known/assetlinks.json
```

The file must:
- Be served with `Content-Type: application/json`
- Be accessible without redirects
- Not require authentication

### Testing:

Use Google's validator:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://jejak-athlete.vercel.app&relation=delegate_permission/common.handle_all_urls
```

## Next.js Configuration

Next.js automatically serves files from the `public` directory. These files will be available at:
- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

No additional configuration is needed in `next.config.mjs`.

## Deployment Checklist

- [ ] Replace `TEAM_ID` in `apple-app-site-association`
- [ ] Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `assetlinks.json`
- [ ] Deploy to production (Vercel)
- [ ] Verify files are accessible via HTTPS
- [ ] Test iOS universal links on a physical device
- [ ] Test Android app links on a physical device
- [ ] Check that files are served with correct Content-Type headers

## Troubleshooting

### iOS Universal Links Not Working:

1. Verify the Team ID is correct
2. Verify the bundle identifier matches: `com.zen0team.detrainer`
3. Delete and reinstall the app
4. Check that the file is served with correct headers
5. Use Apple's validation tool

### Android App Links Not Working:

1. Verify the SHA-256 fingerprint is correct
2. Verify the package name matches: `com.zen0team.detrainer`
3. Verify `autoVerify="true"` in AndroidManifest.xml (handled by Expo)
4. Check logcat for verification errors
5. Use Google's validation tool

## References

- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [Expo Linking Guide](https://docs.expo.dev/guides/linking/)
