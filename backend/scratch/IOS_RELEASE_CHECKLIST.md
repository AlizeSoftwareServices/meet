# iOS App Store & TestFlight Release Checklist

**Application Name**: Meet  
**Bundle Identifier**: `com.alizesoftwareservices.meet`  
**MARKETING_VERSION**: `1.0.0`  
**CURRENT_PROJECT_VERSION**: `1`  
**Xcode Workspace Location**: `frontend/ios/App/App.xcodeproj`  
**Target Platform**: iOS 14.0+  

---

## 1. Project Synchronization Status

- [x] **Capacitor Sync**: `npx cap sync ios` executed and verified.
- [x] **Package.swift Dependencies**: 8 Capacitor native plugins linked via Swift Package Manager.
- [x] **Info.plist**: URL Scheme `meetapp` configured for OAuth callbacks and in-app navigation.
- [x] **Zero Unnecessary Permissions**: No camera, microphone, or photo library permissions requested without explicit feature need.

---

## 2. Step-by-Step macOS & Xcode Release Instructions

> **NOTICE**: Apple iOS `.ipa` compilation, code-signing, and App Store submission require macOS and Xcode.

1. **Transfer / Clone to macOS**:
   Open terminal on your Mac and navigate to the project directory:
   ```bash
   cd frontend
   npx cap open ios
   # Or directly: open ios/App/App.xcodeproj
   ```

2. **Select Developer Team**:
   - In Xcode, select the root **App** project in the navigator.
   - Under **Signing & Capabilities**, select your **Apple Developer Team**.
   - Check **Automatically manage signing**.

3. **Verify Push Notifications & Capabilities**:
   - In **Signing & Capabilities**, click `+ Capability`.
   - Add **Push Notifications** (if not already listed).
   - Add **Background Modes** and enable `Remote notifications`.

4. **Build & Archive**:
   - In the top toolbar, select destination: **Any iOS Device (arm64)**.
   - From the menu bar, select: **Product** -> **Archive**.

5. **Distribute to TestFlight / App Store Connect**:
   - When the Xcode Organizer window appears, select your new archive.
   - Click **Validate App** to run Apple automated validation.
   - Click **Distribute App** -> **App Store Connect** -> **Upload**.
   - Your build will appear in App Store Connect for TestFlight internal/external testing and App Store submission.
