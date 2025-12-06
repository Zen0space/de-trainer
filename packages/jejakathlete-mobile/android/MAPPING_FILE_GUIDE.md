# Quick Guide: ProGuard Mapping Files

## 🎯 What You Need to Know

When you build a release version of the Android app, R8 (Android's code optimizer) will:
1. Shrink your code (remove unused code)
2. Obfuscate class/method names (e.g., `MyClass.myMethod()` → `a.b()`)
3. Generate a `mapping.txt` file that maps obfuscated names back to original names

## 📍 Where to Find the Mapping File

After building a release:
```
android/app/build/outputs/mapping/release/mapping.txt
```

## 🔄 Build Commands

### Using EAS (Recommended)
```bash
# Production build
eas build --platform android --profile production

# Preview build (for testing)
eas build --platform android --profile preview
```

### Local Build
```bash
cd android
./gradlew bundleRelease
# or
./gradlew assembleRelease
```

## 📤 What to Do With the Mapping File

### Option 1: Automatic (EAS Build + Submit)
```bash
eas submit --platform android --latest
```
The mapping file is automatically included in the App Bundle.

### Option 2: Manual Upload to Google Play
1. Build your app
2. Save the `mapping.txt` file
3. Go to Google Play Console
4. Navigate to: Release → App Bundle Explorer → [Your Version] → Downloads
5. Upload the mapping.txt file

### Option 3: Store for Later
Keep the mapping file in a secure location (NOT in git):
- Cloud storage (Google Drive, Dropbox)
- Internal artifact repository
- CI/CD build artifacts

**Naming Convention**: `mapping-v{version}-{buildNumber}.txt`
Example: `mapping-v1.3.11-42.txt`

## ⚠️ Critical Rules

1. **NEVER commit mapping.txt to git** (already in .gitignore)
2. **ALWAYS save the mapping file** for each release
3. **Match mapping files to versions** - you need the exact mapping file for each version to deobfuscate crashes

## 🐛 Deobfuscating a Crash

If you receive an obfuscated crash report:

```bash
# Find the mapping file for that version
cd android/app/build/outputs/mapping/release

# Use retrace to deobfuscate
java -jar $ANDROID_HOME/tools/proguard/lib/retrace.jar \
  mapping.txt \
  obfuscated_crash.txt
```

Or use online tools:
- Google Play Console (automatic if mapping uploaded)
- [ProGuard ReTrace Online](https://www.guardsquare.com/manual/tools/retrace)

## 📊 Verify R8 is Working

After building, check:

```bash
# Check if mapping file exists
ls -lh android/app/build/outputs/mapping/release/mapping.txt

# Check APK/AAB size (should be much smaller)
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

## 🔧 If Something Breaks

If the app crashes after enabling R8:

1. Check the crash log for `ClassNotFoundException` or `MethodNotFoundException`
2. Add a keep rule to `android/app/proguard-rules.pro`:
   ```proguard
   -keep class com.yourpackage.YourClass { *; }
   ```
3. Rebuild and test

## 📞 Need Help?

- Check `PROGUARD_SETUP.md` for detailed documentation
- Review ProGuard rules in `android/app/proguard-rules.pro`
- Test with preview builds before production

---

**Remember**: No mapping file = No way to read crash reports! 🚨
