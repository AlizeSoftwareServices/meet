# Android Store Readiness & Signing Guide

**Application**: Meet (Calendly Clone)  
**Package / Application ID**: `com.alizesoftwareservices.meet`  
**Version**: `1.0.0` (`versionCode 1`)  
**Target SDK**: Android 34 (Android 14)  
**Min SDK**: Android 22 (Android 5.1)  

---

## 1. Native Artifacts Summary

| Artifact | File Path | Size | Signing Status | Usage |
|----------|-----------|:----:|:--------------:|-------|
| **Debug APK** | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` | 12.34 MB | Debug Signed | Internal testing, QA, Sideloading |
| **Release APK** | `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk` | 11.00 MB | Unsigned | Direct distribution after manual keystore signing |
| **Release AAB** | `frontend/android/app/build/outputs/bundle/release/app-release.aab` | 10.73 MB | Unsigned | Production submission to Google Play Console |

---

## 2. Production Keystore Generation & Signing Steps

### Step 1: Generate Release Keystore (if not existing)
```bash
keytool -genkey -v -keystore meet-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias meet-key
```

### Step 2: Sign the Google Play AAB Bundle
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore meet-release-key.jks frontend/android/app/build/outputs/bundle/release/app-release.aab meet-key
```

### Step 3: Verify Bundle Signature
```bash
jarsigner -verify -verbose -certs frontend/android/app/build/outputs/bundle/release/app-release.aab
```
