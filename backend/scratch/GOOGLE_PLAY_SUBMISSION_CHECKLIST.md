# Google Play Store Submission Checklist

**Application Name**: Meet  
**Package Name**: `com.alizesoftwareservices.meet`  
**Current Version**: `1.0.0` (Build `1`)  

---

## Google Play Console Pre-Launch Checklist

### 1. App Details & Store Listing
- [x] **App Name**: `Meet` (max 30 characters)
- [x] **Short Description**: `Effortless scheduling and meeting management for professionals and teams.` (max 80 chars)
- [x] **Full Description**: `Meet is an enterprise-grade scheduling platform providing 1-on-1 scheduling, team round-robin dispatch, collective multi-host scheduling, custom routing forms, developer webhooks, and calendar integrations.`
- [ ] **App Icon (512x512 PNG)**: `ACTION REQUIRED` (Upload final high-res 512x512 icon)
- [ ] **Feature Graphic (1024x500 PNG)**: `ACTION REQUIRED` (Upload promotional banner graphic)
- [ ] **Phone Screenshots (Min 2)**: `ACTION REQUIRED` (Upload portrait screenshots of Dashboard, Booking, and Calendar)

### 2. Policy & Data Safety
- [x] **Privacy Policy URL**: `https://meet.alizesoftwareservices.com/privacy`
- [x] **Terms of Service URL**: `https://meet.alizesoftwareservices.com/terms`
- [x] **Target Audience**: 18+ (General Business/Professional Productivity)
- [x] **Data Safety Declaration**:
  - Personal Info: Name, Email (for booking creation and notifications)
  - Device/Other IDs: FCM Push Notification Token
  - Data Encrypted in Transit: Yes (HTTPS/TLS)
  - Account Deletion Supported: Yes (via user settings or request)
- [x] **Permissions Declaration**: `POST_NOTIFICATIONS` for meeting reminders and booking alerts.

### 3. Binary & Release Management
- [x] **Build Format**: Android App Bundle (`app-release.aab` - 10.73 MB)
- [ ] **Keystore Signing**: `ACTION REQUIRED` (Sign with private developer keystore before upload)
- [ ] **Google Play App Signing**: Enable in Google Play Console.
