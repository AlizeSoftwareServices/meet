# iOS Store Readiness & Real-Device QA Plan

**Application Name**: Meet  
**Bundle Identifier**: `com.alizesoftwareservices.meet`  
**Version**: `1.0.0` (Build `1`)  
**Xcode Workspace**: `frontend/ios/App/App.xcodeproj`  
**Deployment Target**: iOS 14.0+  

---

## 1. Project Synchronization & Configuration Status

- [x] **Capacitor Sync**: `npx cap sync ios` synced all web assets and 8 Swift plugins into `ios/App`.
- [x] **Package.swift Dependencies**: Swift Package Manager dependencies configured.
- [x] **Custom Scheme**: `meetapp://` configured in `Info.plist` for OAuth callbacks and in-app deep linking.
- [x] **Zero Unused Permissions**: Camera, microphone, and contacts permissions omitted to prevent App Store rejection.

---

## 2. Step-by-Step macOS & Xcode Release Instructions

> **NOTICE**: iOS IPA compilation, code signing, and App Store submission require macOS and Xcode.

1. **Transfer Project to macOS**:
   ```bash
   cd frontend
   npx cap open ios
   # Or directly: open ios/App/App.xcodeproj
   ```

2. **Configure Developer Team & Signing**:
   - In Xcode, select the root **App** target -> **Signing & Capabilities**.
   - Check **Automatically manage signing** and select your **Apple Developer Team**.

3. **Verify Push Capability & APNs**:
   - Add **Push Notifications** capability.
   - Enable **Background Modes** -> `Remote notifications`.
   - Upload APNs Auth Key (.p8 file) to Firebase / Push service backend.

4. **Archive & Upload to TestFlight / App Store Connect**:
   - Set build destination: **Any iOS Device (arm64)**.
   - Menu: **Product** -> **Archive**.
   - In Organizer: Click **Validate App**, then click **Distribute App** -> **App Store Connect** -> **Upload**.

---

## 3. Real iOS Device QA Matrix

| Area | Test Scenario | Expected Result | macOS Step Required? |
|------|---------------|-----------------|:-------------------:|
| **Authentication** | Register / Login / Logout | JWT persisted, restored on restart, cleared on logout | No (API tested) / Yes on hardware |
| **Booking** | Personal, Round Robin, Collective | Availability slots rendered, booking confirmed | No (API tested) / Yes on hardware |
| **Push Notifications** | APNs token registration & tap | Token sent to backend; tap routes to `/dashboard/bookings` | Yes (Requires physical iPhone + APNs key) |
| **OAuth** | Google / Microsoft / Slack | SafariViewController opens, returns via `meetapp://` | Yes (Requires real device / simulator) |
| **Safe Areas** | iPhone notch, Dynamic Island, Home bar | Headers and bottom actions do not clip | Yes (Tested on iOS simulator / device) |
