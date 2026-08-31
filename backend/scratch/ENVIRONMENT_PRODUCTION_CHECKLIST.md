# Environment Production Configuration Checklist

This checklist documents all production environment variables required for deploying the Meet / Calendly clone backend and frontend.

> **CRITICAL SECURITY RULE**: Never commit real secret keys, private passwords, database connection strings, or signing certificates to source control.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Description | Example / Recommended Format |
|---------------|:--------:|-------------|------------------------------|
| `PORT` | Yes | Port on which the NestJS backend server listens | `3001` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `DATABASE_URL` | Yes | Database connection string (PostgreSQL/MongoDB) | `postgresql://user:password@host:5432/meetdb?schema=public` |
| `JWT_SECRET` | Yes | Cryptographic secret for signing JWT access tokens (min 64 chars) | High-entropy 64-character hexadecimal string |
| `JWT_EXPIRES_IN` | Yes | Token expiration duration | `7d` |
| `FRONTEND_URL` | Yes | Canonical public URL of the web frontend | `https://meet.alizesoftwareservices.com` |
| `MOBILE_DEEP_LINK_SCHEME`| Yes | Custom URI scheme for mobile application | `meetapp` |
| `SMTP_HOST` | Yes | SMTP mail server hostname | `smtp.sendgrid.net` / `smtp.mailgun.org` |
| `SMTP_PORT` | Yes | SMTP port (SSL/TLS) | `587` or `465` |
| `SMTP_SECURE` | Yes | Whether to use TLS | `true` |
| `SMTP_USER` | Yes | SMTP authentication username | `apikey` |
| `SMTP_PASSWORD` | Yes | SMTP authentication password / API key | Production SMTP password |
| `SMTP_FROM` | Yes | Default sender email address | `"Meet" <notifications@meet.alizesoftwareservices.com>` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID for Calendar/Login | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret | Production Google Secret |
| `MICROSOFT_CLIENT_ID` | Optional | Microsoft Azure OAuth application client ID | `...-uuid` |
| `MICROSOFT_CLIENT_SECRET`| Optional | Microsoft Azure client secret | Production Azure Secret |
| `SLACK_CLIENT_ID` | Optional | Slack App Client ID for webhook integration | `...` |
| `SLACK_CLIENT_SECRET` | Optional | Slack App Client Secret | Production Slack Secret |
| `FIREBASE_PROJECT_ID` | Optional | Firebase Cloud Messaging (FCM) Project ID | `meet-production` |
| `FIREBASE_CLIENT_EMAIL` | Optional | FCM service account email | `firebase-adminsdk@meet-production.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Optional | FCM service account private key | `-----BEGIN PRIVATE KEY-----\n...` |

---

## 2. Frontend Environment Variables (`frontend/.env.production`)

| Variable Name | Required | Description | Example / Recommended Format |
|---------------|:--------:|-------------|------------------------------|
| `NEXT_PUBLIC_API_URL` | Yes | Public HTTPS URL of the backend API | `https://api.meet.alizesoftwareservices.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public HTTPS URL of the web app | `https://meet.alizesoftwareservices.com` |
| `NEXT_PUBLIC_APP_NAME` | Yes | Branding name of the platform | `Meet` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional | Contact email displayed on error screens | `support@alizesoftwareservices.com` |
