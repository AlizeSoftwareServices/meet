# Full Feature-Parity Audit: Meet / Calendly Clone

**Date:** August 28, 2026  
**Auditor:** Antigravity AI  
**Scope:** Entire Codebase (`backend/`, `frontend/`, `capacitor`, database schema, security, integrations, and mobile readiness)  
**Status:** Audit Only (No source code or schema modifications applied during this phase)

---

## Executive Summary

The Meet / Calendly clone codebase has completed Phases 3A through 4D. The system possesses a functional core scheduling engine supporting personal event types, multi-host Round-Robin and Collective scheduling, custom questions, recurring series, action tokens (cancellation/rescheduling), basic Google & Microsoft calendar synchronization, Firebase push notifications (backend service), and email delivery.

However, a comprehensive feature-parity and production-readiness audit reveals **several critical architectural gaps, production risks, disconnected UI components, and missing mobile primitives** that must be resolved before proceeding to Phase 5 and mobile packaging:

1. **Host Scope Bug in Secondary Collective Bookings:** When secondary hosts view their bookings (`/bookings/host`) or have their availability checked for subsequent bookings (`evaluateSlots`), queries filter only on `where: { hostId }`, omitting bookings where they are assigned as secondary hosts via `BookingHost`.
2. **Missing Push Token Registration API:** While the backend has a `PushNotificationService` and `PushToken` Prisma model, there is no controller route (`POST /users/push-token` or similar) for the mobile app to register device FCM tokens.
3. **Hardcoded OAuth Redirect URLs:** Google, Microsoft, and Slack OAuth callback handlers in `integrations.controller.ts` redirect to `http://localhost:3000/...` instead of using dynamic/environment-based URLs or custom URI schemes required by mobile apps.
4. **Disconnected & Mocked Frontend Pages:** 
   - `dashboard/page.tsx` renders fallback dummy mock data (`mockBookings` with fake names Alice, Bob, Charlie; `mockAnalytics` with fake metrics) if real data is empty or loading.
   - `events/page.tsx` links the "Meeting Poll" action to `/dashboard/events/new-poll`, which is a static mockup with an `alert()` message, rather than the functional `/dashboard/polls/new` page.
   - Routing forms (`/routing`) exist only on the backend—there is zero frontend interface for creating, managing, or publicly viewing routing forms.
   - Event creation (`events/new/page.tsx`) ignores `?type=` query parameters from the creation menu.
   - Event editing (`events/[id]/edit/page.tsx`) completely lacks fields to view or change team scheduling type or assigned team hosts.
5. **Absence of Webhook Subscriptions & Payments:** No generic outgoing webhook subscription engine exists (`WorkflowActionType` only supports `EMAIL`), and no payment processor integration (Stripe / PayPal) is present.
6. **Mobile Platform Incompleteness:** Android Capacitor platform is initialized, but iOS (`@capacitor/ios`) is not installed or configured. Next.js export configuration is not configured for static compilation (`output: 'export'` missing in `next.config.ts`), and deep-link routing is unhandled.

---

## Fully Implemented Features (✅)

| Feature | Backend Component | Frontend Component | Verification Status |
| :--- | :--- | :--- | :--- |
| **User Authentication & Auth Guards** | `backend/src/auth/` (JWT, bcrypt, password reset, email verification, throttler) | `frontend/src/app/(auth)/` (login, register, forgot-password, reset-password, verify-email) | ✅ Fully verified |
| **Personal Availability Engine** | `backend/src/availability/` (weekly recurring slots, date overrides, timezone conversion via `date-fns-tz`) | `frontend/src/app/dashboard/availability/` (interactive weekly grid, overrides, schedule switcher) | ✅ Fully verified |
| **Booking Creation & Action Tokens** | `backend/src/bookings/` (OCC optimistic locking, SHA-256 action tokens for reschedule/cancel) | `frontend/src/app/book/[username]/[slug]/`, `frontend/src/app/guest/` (cancel, reschedule, confirmed) | ✅ Fully verified |
| **Custom Question Engine** | `backend/src/event-types/` & `backend/src/bookings/` (`CustomQuestion` & `QuestionAnswer` models with types `TEXT`, `LONG_TEXT`, `NUMBER`, `PHONE`, `DROPDOWN`, `MULTIPLE_CHOICE`, `CHECKBOX`) | `frontend/src/components/dashboard/CustomQuestionsEditor.tsx` & dynamic form rendering in booking page | ✅ Fully verified |
| **Recurring Bookings** | `backend/src/bookings/` (`BookingSeries` model, frequency calculation, conflict skipping) | `frontend/src/app/book/[username]/[slug]/page.tsx` (recurrence toggle, summary card) | ✅ Fully verified |
| **Single-Use Booking Links** | `backend/src/event-types/` (`SingleUseLink` token generation, invalidation on use) | `frontend/src/app/dashboard/events/page.tsx` (single-use link generation modal & copy) | ✅ Fully verified |
| **Team Management & Role RBAC** | `backend/src/teams/` (`Team`, `TeamMember`, `TeamInvitation`, `OWNER`/`ADMIN`/`MEMBER` permissions) | `frontend/src/app/dashboard/teams/page.tsx` & `frontend/src/app/guest/invitation/page.tsx` | ✅ Fully verified |
| **Round-Robin Scheduling** | `backend/src/availability/availability.engine.ts` (`evaluateTeamSlots` union availability, least-busy host selection) | `frontend/src/app/dashboard/events/new/page.tsx` & public booking page badge | ✅ Fully verified |
| **Collective Multi-Host Booking** | `backend/src/bookings/bookings.service.ts` (`BookingHost` junction, intersection availability, multi-host notifications) | `frontend/src/app/dashboard/events/new/page.tsx` & public booking page badge | ✅ Fully verified |
| **Contacts Auto-Indexing** | `backend/src/contacts/` (upsert contact on confirmed booking, meeting counter) | `frontend/src/app/dashboard/contacts/page.tsx` (search, manual contact editing) | ✅ Fully verified |
| **Meeting Polls (Core)** | `backend/src/polls/` (`Poll`, `PollSlot`, `PollVote` models, public voting) | `frontend/src/app/dashboard/polls/` & `frontend/src/app/polls/[id]/page.tsx` | ✅ Fully verified |
| **Automated 24h Workflows (Cron)** | `backend/src/integrations/cron.service.ts` (5-minute cron runner, `WorkflowExecution` deduplication) | `frontend/src/app/dashboard/workflows/page.tsx` | ✅ Fully verified |

---

## Partially Implemented Features (🟡)

| Feature | File Reference | Status & Deficiencies |
| :--- | :--- | :--- |
| **Google Calendar Integration** | `backend/src/integrations/calendar.service.ts:23-50, 124-171`<br>`backend/src/integrations/integrations.controller.ts:75-116` | 🟡 OAuth, Free/Busy check, and event create/update/delete work. **Deficiencies:** Callback redirects to hardcoded `localhost:3000`. Does not handle multiple connected calendars per user or selective calendar conflict checking. |
| **Microsoft Graph Integration** | `backend/src/integrations/calendar.service.ts:53-122, 174-205`<br>`backend/src/integrations/integrations.controller.ts:120-182` | 🟡 OAuth token auto-refresh and Graph API event sync work. **Deficiencies:** Hardcoded `localhost:3000` redirect. Lacks multi-calendar selection. |
| **Slack Integration** | `backend/src/integrations/slack.service.ts:1-90`<br>`backend/src/integrations/integrations.controller.ts:185-248` | 🟡 Incoming webhook dispatch works on booking confirmation/cancellation. **Deficiencies:** Hardcoded `localhost:3000` redirect; only posts to a single fixed webhook URL. |
| **Event Type Editing** | `frontend/src/app/dashboard/events/[id]/edit/page.tsx:1-386` | 🟡 Can edit title, duration, questions, availability schedule. **Deficiencies:** Lacks controls for `schedulingType` (Round Robin / Collective) and host assignments once created. |
| **Dashboard Analytics** | `frontend/src/app/dashboard/page.tsx:40-66`<br>`backend/src/analytics/analytics.service.ts:1-120` | 🟡 Backend computes real aggregate stats. **Deficiencies:** Frontend falls back to static dummy data (`mockBookings`, `mockAnalytics`) if user data is empty. |
| **Workflows Engine** | `backend/src/workflows/` & `backend/src/integrations/cron.service.ts` | 🟡 Supports `BEFORE_EVENT` and `AFTER_EVENT` email reminders. **Deficiencies:** Action type is strictly limited to `EMAIL`. No SMS, Webhook, or WhatsApp actions. |

---

## Missing Features (❌)

1. **Generic Outgoing Webhooks System (Calendly Feature Parity)**
   - No `Webhook` model in Prisma.
   - No webhook delivery service with HMAC-SHA256 signature headers, retry backoff, and delivery logging.
   - No UI in dashboard for developers/users to configure endpoints for `booking.created`, `booking.canceled`, `booking.rescheduled`.
2. **Paid Bookings & Payment Gateway Integration (Stripe / PayPal)**
   - No ability to require payment before confirming a booking.
   - No payment processing tables (`Payment`, `Transaction`, `Refund`).
3. **Frontend Routing Forms Interface**
   - Backend `RoutingController` and `RoutingService` are functional, but `frontend/src/app/dashboard/` has **no routing page** or form builder, and no public form submission route (`/forms/[slug]`).
4. **Push Token Registration Endpoint**
   - Frontend `lib/pushNotifications.ts` listens for FCM token registration, but backend lacks an endpoint (`POST /users/push-tokens`) to store it in the database.
5. **Multi-Calendar Conflict Checking**
   - Users can only connect one calendar per provider (`userId_provider` unique index). Cannot check conflicts across multiple sub-calendars or secondary Google/Outlook accounts.
6. **Custom Domain / CNAME Support**
   - No tenant routing or domain mapping for custom booking domains (e.g., `meet.mycompany.com`).
7. **Embeddable Booking Widget**
   - No iframe widget or embed script (`<script src=".../widget.js">`) for embedding the booking calendar on external websites.

---

## Production Risks (🔴)

| Risk Area | Severity | Impact | Location |
| :--- | :--- | :--- | :--- |
| **Secondary Host Booking Visibility** | **CRITICAL** | Secondary hosts in Collective meetings cannot see those bookings in `/bookings/host` because the query only filters `where: { hostId }`. | `backend/src/bookings/bookings.service.ts:468` |
| **Secondary Host Conflict Evaluation** | **CRITICAL** | When checking availability for a host, `evaluateSlots` queries `where: { hostId }`. If the host is booked as a secondary host in a Collective meeting, that slot appears free, causing double bookings. | `backend/src/availability/availability.engine.ts:142` |
| **Unhandled SMTP Exception in Team Invites** | **HIGH** | If SMTP credentials fail or are rate-limited, `inviteMember` throws an unhandled 500 error after saving the invitation, breaking the UI. | `backend/src/teams/teams.service.ts:142` |
| **Hardcoded OAuth Redirects** | **HIGH** | All OAuth callbacks redirect to `http://localhost:3000`. In staging, production, or mobile webview environments, OAuth completion will fail. | `backend/src/integrations/integrations.controller.ts:79, 111, 177, 243` |
| **Mock Data Masking Real Zero-States** | **MEDIUM** | Dashboard displays fake bookings (Alice Johnson, Bob Smith) and fake analytics when new users have 0 meetings. | `frontend/src/app/dashboard/page.tsx:40-66` |
| **Broken Meeting Poll Navigation** | **MEDIUM** | Clicking "Meeting poll" in the Events dropdown routes to `/dashboard/events/new-poll` (mock alert page) instead of `/dashboard/polls/new`. | `frontend/src/app/dashboard/events/page.tsx:171` |

---

## Security Findings

1. **Authentication & Authorization:**
   - Strict `JwtAuthGuard` applied across private endpoints.
   - Team mutation endpoints enforce role checks (`OWNER`, `ADMIN`).
   - Action tokens (cancellation/rescheduling) use SHA-256 hashes with 7-day expirations and single-use invalidation.
2. **IDOR & Parameter Tampering:**
   - Fixed in Phase 4D: Team event creation validates that host IDs belong to the specified team.
   - `getHostBookings` and `getForms` strictly scope queries by `req.user.userId`.
3. **Public API Data Exposure:**
   - Public profile endpoint (`/public/users/:username`) exposes only public profile attributes (`name`, `avatar`, `bio`, `brandColor`, active `eventTypes`).
   - Guest booking flow does not reveal private internal host IDs or other team members' schedules.
4. **Rate Limiting:**
   - NestJS `@nestjs/throttler` is globally bound in `AppModule` and configured with `@Throttle` on public endpoints (`/auth/login`, `/public/bookings`, `/polls/:id/vote`).
5. **CORS & Headers:**
   - `helmet` is configured with `crossOriginResourcePolicy: { policy: "cross-origin" }`.
   - Dynamic CORS origins loaded from `process.env.CORS_ORIGINS`, with `capacitor://localhost` included for mobile.

---

## Database Audit (Prisma & MongoDB)

1. **Schema Integrity:**
   - `EventType -> Team` relation updated to `onDelete: SetNull` in Phase 4D to prevent cascading data loss on team deletion.
   - Junction collections (`EventTypeHost`, `BookingHost`, `TeamMember`, `PollVote`, `WorkflowExecution`) have proper compound `@@unique` constraints.
2. **MongoDB Driver Specifics:**
   - Prisma with MongoDB does not support `skipDuplicates` in `createMany`. Individual upserts or `try/catch` loops are properly used across services.
   - Optimistic Concurrency Control (OCC) uses `bookingVersion: { increment: 1 }` inside `prisma.$transaction`.
3. **Indexing Recommendations:**
   - `Booking` collection has indexes on `[hostId, startTime]` and `[hostId, status]`.
   - **Needed Index:** Index on `BookingHost` `[userId, bookingId]` for fast secondary host lookup.

---

## External Integration Findings

### 1. Google Calendar
- **Token Handling:** Stores `accessToken` and `refreshToken`. Listens on `oauth2Client.on('tokens')` to persist refreshed tokens.
- **Resilience:** Marks `accessToken: 'EXPIRED'` if `invalid_grant` error is returned.
- **Limitation:** Does not support secondary Google calendars.

### 2. Microsoft Graph
- **Token Handling:** Custom refresh logic with `https://login.microsoftonline.com/common/oauth2/v2.0/token`.
- **Resilience:** Marks token as `'EXPIRED'` and prompts reconnection on refresh failure.

### 3. Firebase Cloud Messaging (Push Notifications)
- **Status:** Backend SDK initialized safely with environment variable fallback.
- **Blocker:** Missing API route for mobile clients to submit their device token to the `PushToken` database table.

### 4. Email (SMTP / Nodemailer)
- **Status:** HTML templates for booking confirmations, cancellations, rescheduling, reminders, and team invitations.
- **Templates:** Includes `.ics` calendar invite attachments for automatic calendar imports in Apple Mail, Outlook, and Gmail.

---

## Mobile / Capacitor Readiness (Android APK & iOS IPA)

### Android (APK) Status: 🟡 In Progress (Blockers Present)
- `@capacitor/android` is installed and `frontend/android` workspace is generated.
- `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar`, and `@capacitor/share` are integrated.
- **Blockers for Release:**
  1. No push token registration endpoint to send FCM token to backend.
  2. Next.js export configuration is missing `output: 'export'`, causing `webDir: 'out'` to be stale unless manually exported.
  3. External browser OAuth callback must use custom URL scheme (e.g., `meetapp://oauth-callback`) instead of redirecting to `localhost:3000`.
  4. Camera/gallery permissions not declared in `AndroidManifest.xml` for avatar uploads.

### iOS (IPA) Status: ❌ Not Ready
- `@capacitor/ios` is **not installed** in `frontend/package.json`.
- `frontend/ios` Xcode workspace has not been created or configured.
- Universal Links / Deep Links for guest rescheduling/cancellation and team invites not configured for iOS.
- Apple Push Notification service (APNs) configuration and entitlement files do not exist.

---

## Performance Findings

| Severity | Issue | Recommendation |
| :--- | :--- | :--- |
| **High** | Sequential Free/Busy queries in multi-host collective scheduling. | Execute external Google/Microsoft FreeBusy queries in parallel using `Promise.all`. |
| **Medium** | Uncached availability calculations for public profile pages. | Implement short-lived Redis caching (30–60s) for slot evaluations. |
| **Medium** | Missing pagination on `/bookings/host` and `/contacts`. | Add `page` and `limit` query parameters with Prisma `skip`/`take`. |
| **Low** | Full model fetching in `getUserProfile` without projection. | Use Prisma `select` to omit internal database fields from public responses. |

---

## Critical Blockers (P0)

1. **Fix Secondary Host Querying in Bookings & Availability:**
   - Update `getHostBookings` in `bookings.service.ts` to include bookings where user is in `assignedHosts`.
   - Update `evaluateSlots` in `availability.engine.ts` to include `assignedHosts` in `existingBookings` check.
2. **Add Push Token Registration API:**
   - Create `POST /users/push-token` and `DELETE /users/push-token` in backend and wire up `frontend/src/lib/pushNotifications.ts`.
3. **Environment-Driven OAuth Redirects:**
   - Replace hardcoded `http://localhost:3000` redirects in `integrations.controller.ts` with `process.env.FRONTEND_URL` and support custom mobile schemes.
4. **Eliminate Frontend Mock Fallbacks:**
   - Remove fake bookings/analytics in `dashboard/page.tsx` and render proper empty states.
   - Fix `/dashboard/events/page.tsx` meeting poll link to point to `/dashboard/polls/new`.

---

## Recommended Phase 5 Priority Roadmap

| Priority | Feature / Task | Current State | Risk / Impact | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **Fix Multi-Host Secondary Booking & Conflict Logic** | Only filters `where: { hostId }` | Double-bookings & hidden meetings for secondary hosts | Query `OR: [{ hostId }, { assignedHosts: { some: { userId } } }]` |
| **P0** | **Push Notification Device Token API** | Backend service exists, API route missing | Mobile push notifications completely broken | Add `POST /users/push-token` endpoint & connect frontend |
| **P0** | **Dynamic OAuth Redirects for Web & Mobile** | Hardcoded `http://localhost:3000` | OAuth broken in production & mobile | Use `FRONTEND_URL` / custom URI scheme |
| **P0** | **Frontend UI Cleanup & Routing Fixes** | Fake mock data in dashboard, dead poll link | Degrades user trust & functionality | Replace with clean empty states; fix poll navigation |
| **P1** | **Developer Webhooks Engine** | Missing | Cannot integrate with Zapier / external tools | Add `Webhook` model, HMAC signing, and event dispatcher |
| **P1** | **Routing Forms Frontend Interface** | Backend exists, Frontend missing | Users cannot use the routing feature built in Phase 4C | Build routing form builder and public submission page |
| **P1** | **Event Type Edit Form Completion** | Edit form missing host/team controls | Cannot edit team hosts or scheduling type | Add scheduling type and team host selectors to edit page |
| **P1** | **Next.js Mobile Static Export & Capacitor Sync** | `next.config.ts` lacks static export config | APK/iOS builds contain stale web assets | Configure `output: 'export'` and automated build script |
| **P2** | **iOS Platform Initialization (`@capacitor/ios`)** | Not added | Cannot build iOS IPA | Add Capacitor iOS platform, configure Podfile & permissions |
| **P2** | **Paid Bookings (Stripe Integration)** | Missing | Cannot charge for appointments | Add Stripe Checkout / Elements integration |
| **P2** | **Multi-Calendar Support** | Single calendar per provider | Power users cannot sync personal + work calendars | Expand `Integration` model to support multiple accounts |
| **P2** | **Embeddable Booking Widget** | Missing | Cannot embed booking on WordPress/Webflow | Build standalone JavaScript iframe embed widget |

---

## Final Review & Decision Checklist

### 1. Is the backend feature set sufficiently complete to begin mobile integration?
**YES (with 3 P0 fixes applied first).**  
The core backend APIs for authentication, scheduling, availability, multi-host booking, and calendar synchronization are solid and verified. Before packaging the mobile app, the backend must add the push token registration endpoint, fix secondary host queries, and support dynamic OAuth redirects.

### 2. Is the frontend sufficiently complete for Android APK integration?
**YES (after P0 UI fixes and static export configuration).**  
The frontend UI is responsive, uses Tailwind CSS, shadcn UI components, and framer-motion animations. Once mock fallbacks are replaced with empty states, dead links are corrected, and `next.config.ts` is configured with `output: 'export'`, the Android APK build can proceed.

### 3. Is the frontend sufficiently complete for iOS IPA integration?
**NO.**  
`@capacitor/ios` is not installed, the `frontend/ios` Xcode workspace is not initialized, iOS permissions (camera, notifications) are not configured, and Apple Universal Links are not set up.

### 4. What are the P0 blockers?
1. Querying secondary host assignments in `getHostBookings` and `evaluateSlots`.
2. Creating the `POST /users/push-token` endpoint on the backend and wiring it to `frontend/src/lib/pushNotifications.ts`.
3. Making OAuth redirects environment-configurable (`process.env.FRONTEND_URL`) to support mobile deep links.
4. Removing `mockBookings`/`mockAnalytics` in `dashboard/page.tsx` and correcting the `/dashboard/polls/new` link in `events/page.tsx`.

### 5. What should Phase 5 contain?
1. **Phase 5A: Production Hardening & P0 Core Fixes** (Multi-host secondary queries, Push Token API, OAuth dynamic redirects, mock removal, and edit form host management).
2. **Phase 5B: Developer Webhooks System** (`Webhook` model, event triggers for create/cancel/reschedule, HMAC signatures, delivery logs).
3. **Phase 5C: Routing Forms UI** (Dashboard form builder, rule configurator, and public submission page).
4. **Phase 5D: Mobile & Capacitor Production Build** (Next.js static export pipeline, Android APK generation, iOS platform setup, and in-app OAuth).

### 6. What can be postponed until after APK/IPA release?
- Stripe / Paid Bookings integration
- Multi-calendar support per provider (multiple Google/Outlook accounts)
- Custom domain / CNAME routing
- Embeddable JavaScript widget for external sites
- SMS / WhatsApp workflow notifications
