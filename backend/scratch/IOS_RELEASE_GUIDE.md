# iOS Production Release Guide — Xcode & App Store Preparation

**Application**: Meet (Calendly Clone)  
**Bundle Identifier**: `com.alizesoftwareservices.meet`  
**Xcode Workspace Location**: `frontend/ios/App/App.xcodeproj`  
**Custom URL Scheme**: `meetapp://`  
**Capacitor Version**: 8.x  

---

## 1. Prerequisites (macOS Environment)
- Mac machine running macOS 14 (Sonoma) or macOS 15 (Sequoia).
- Xcode 16+ installed from Mac App Store.
- Apple Developer Program account with Admin/Account Holder role.
- CocoaPods / SPM initialized (`npx cap sync ios` already configured `Package.swift`).

---

## 2. Step-by-Step Build & Archive Instructions

### Step 1: Open the Project in Xcode
```bash
cd frontend
npx cap open ios
# OR directly: open ios/App/App.xcodeproj
```

### Step 2: Configure Team and Signing
1. Select the top-level **App** project in the Project Navigator.
2. Select the **App** target.
3. Open the **Signing & Capabilities** tab:
   - Check **Automatically manage signing**.
   - Select your registered **Apple Developer Team**.
   - Verify Bundle Identifier: `com.alizesoftwareservices.meet`.

### Step 3: Verify Capabilities
1. In **Signing & Capabilities**, verify:
   - **Push Notifications**: (Click `+ Capability` -> `Push Notifications` if not already present).
   - **Background Modes**: Check `Remote notifications`.
   - **Associated Domains**: (Optional, for universal links `applinks:meet.alizesoftwareservices.com`).

### Step 4: Verify URL Scheme
1. In Xcode, go to the **Info** tab under the **App** target.
2. Expand **URL Types**.
3. Verify that URL Scheme `meetapp` is registered with Identifier `com.alizesoftwareservices.meet`.

### Step 5: Select Destination & Build Archive
1. In the top toolbar, select the build scheme **App** and set the destination to **Any iOS Device (arm64)** (or your plugged-in physical test iPhone).
2. Go to the menu bar: **Product** -> **Archive**.
3. Xcode will compile Swift native plugins and web bundle into an `.xcarchive`.

### Step 6: Validate & Distribute via TestFlight / App Store
1. When the Organizer window opens with your new archive:
   - Click **Validate App** to run automated pre-submission checks.
   - Click **Distribute App**:
     - Choose **App Store Connect** for TestFlight and App Store release.
     - Select **Upload** to submit directly to App Store Connect.
     - Alternatively, select **Export** to save an `.ipa` file for enterprise/ad-hoc distribution.

---

## 3. APNs Push Notification Certificate Setup
1. In the [Apple Developer Member Center](https://developer.apple.com/account/resources/identifiers/list), select Identifiers -> `com.alizesoftwareservices.meet`.
2. Under Capabilities, enable **Push Notifications**.
3. Create an **APNs Key** (.p8 file) under **Keys** -> `Apple Push Notifications service (APNs)`.
4. Upload the APNs Key (`Key ID`, `Team ID`, and `.p8` file) to your Firebase Cloud Messaging (FCM) Console or push service backend.
