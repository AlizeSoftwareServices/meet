# Android Google Play Release Checklist

**Application Name**: Meet  
**Package / Application ID**: `com.alizesoftwareservices.meet`  
**Current Version Code**: `1`  
**Current Version Name**: `1.0.0`  
**Target SDK**: Android 34 (Android 14)  
**Min SDK**: Android 22 (Android 5.1)  

---

## 1. Native Build Artifacts

| Artifact | Location | Size | Signing Status | Usage |
|----------|----------|:----:|:--------------:|-------|
| **Debug APK** | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` | 12.34 MB | Debug Signed | Internal testing / QA on emulator and physical devices |
| **Release APK** | `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk` | 11.00 MB | Unsigned | Direct distribution / Sideloading after manual signing |
| **Release AAB** | `frontend/android/app/build/outputs/bundle/release/app-release.aab` | 10.73 MB | Unsigned | Production upload to Google Play Console |

---

## 2. Google Play Store Readiness Checklist

### A. Technical & Binary Checks
- [x] **AAB Format**: Release artifact is formatted as an Android App Bundle (`.aab`).
- [x] **Target SDK**: Configured for Android 34+ compliance.
- [x] **Version Code & Name**: `versionCode 1`, `versionName "1.0.0"`.
- [x] **Permissions**: Minimal permissions requested (`INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `VIBRATE`).
- [x] **App Links / Deep Linking**: Configured in `AndroidManifest.xml` with intent filters for `meetapp://` and `https://meet.alizesoftwareservices.com`.
- [x] **Splash Screen & Status Bar**: Handled via Capacitor native plugins.

### B. Production Signing Instructions (Manual Step)
1. **Generate Release Keystore** (if not already generated):
   ```bash
   keytool -genkey -v -keystore meet-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias meet-key
   ```
2. **Sign the Android App Bundle (AAB)**:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore meet-release-key.jks frontend/android/app/build/outputs/bundle/release/app-release.aab meet-key
   ```
3. **Upload to Google Play Console**:
   - Navigate to Google Play Console -> **Release** -> **Production** -> **Create new release**.
   - Upload the signed `app-release.aab`.
   - Submit for Google Play Store review.
