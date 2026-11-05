import Link from 'next/link';
import { Shield, ArrowLeft, Lock, CheckCircle2, Globe, Calendar, Mail, FileText, Database, UserCheck, EyeOff } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Meet by Alize Software Services',
  description: 'Comprehensive Privacy Policy and Google API User Data disclosures for Meet scheduling platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation Back */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Effective Date: November 5, 2026 &bull; Alize Software Services Private Limited
              </p>
            </div>
          </div>
        </div>

        {/* 1. Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>1. Introduction & Overview</span>
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Alize Software Services Private Limited</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or &ldquo;Alize&rdquo;) operates <strong>Meet</strong>, accessible at <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">meet.alizesoftwareservices.com</code>. We provide an online automated appointment scheduling platform that connects hosts and invitees to streamline meetings and video conferencing.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            We respect your privacy and are committed to protecting personal data. This Privacy Policy outlines our transparent data practices in compliance with global standards, including the <strong>Google API Services User Data Policy</strong>, the <strong>General Data Protection Regulation (GDPR)</strong>, the <strong>California Consumer Privacy Act (CCPA)</strong>, and the <strong>Digital Personal Data Protection (DPDP) Act of India</strong>.
          </p>
        </section>

        {/* 2. Clear Roles: Hosts vs. Invitees */}
        <section className="space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>2. Categories of Users: Hosts & Invitees</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Account Holders (&ldquo;Hosts&rdquo;)</h3>
              <p className="text-xs leading-relaxed">
                Individuals or business teams who register for a Meet account to configure event types, publish available hours, connect external calendars, and manage scheduled meetings.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Booking Visitors (&ldquo;Invitees&rdquo;)</h3>
              <p className="text-xs leading-relaxed">
                Individuals who book a meeting on a Host&rsquo;s public scheduling link. Invitees do not need a Meet account to schedule time with a Host.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Google API User Data & Limited Use (CRITICAL COMPLIANCE) */}
        <section className="space-y-4 bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-blue-950 dark:text-blue-200 font-bold text-lg">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3>3. Google API Services User Data Policy Compliance</h3>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Meet integrates with the Google Calendar API and Google Meet conferencing to automate scheduling. Meet&rsquo;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-bold underline hover:text-blue-700"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Exact Scopes Requested & Functional Purpose:
            </h4>
            <div className="space-y-3 text-sm">
              <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-zinc-900 dark:text-white text-xs mb-1">
                  1. <code>https://www.googleapis.com/auth/calendar.events</code> (Google Calendar Events)
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  <strong>Conflict Detection</strong>: Meet reads start and end timestamps of existing events on your connected calendar to determine when you are busy and automatically remove booked times from your public scheduling page. We do <strong>not</strong> read the private descriptions, notes, or invitee lists of your personal calendar events.<br />
                  <strong>Booking Insertion</strong>: When an invitee books a meeting, Meet automatically inserts the confirmed event into your Google Calendar, including date, time, title, invitee email, and conference link.
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-zinc-900 dark:text-white text-xs mb-1">
                  2. Google Meet Video Conferencing (<code>conferenceData</code>)
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Automatically generates dynamic, secure Google Meet video call links (<code className="text-[11px]">meet.google.com/xxx-xxxx-xxx</code>) and attaches them to confirmed calendar invites for both the host and guest.
                </p>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 pt-2">
              Our Strict Guarantees on Google User Data:
            </h4>
            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No AI Training</strong>: We never use Google user data, calendar event content, or invitee communications to train, develop, or fine-tune machine learning or artificial intelligence models.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No Advertising or Sale</strong>: We never sell, lease, transfer, or disclose Google user data to third parties, data brokers, or advertising networks under any circumstances.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No Human Inspection</strong>: No employee, contractor, or personnel at Meet reads or inspects your private calendar contents unless you explicitly grant written permission for technical troubleshooting.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Information We Collect */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">4. Information We Collect</h2>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <p>We collect only the minimum data required to facilitate scheduling:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Host Account Data</strong>: Full name, business email address, encrypted password hash (argon2/bcrypt), avatar image, timezone, company name, brand colors, and personal booking slug (e.g. <code className="text-xs">team-m4q9xc</code>).
              </li>
              <li>
                <strong>Availability Configurations</strong>: Working hours schedule (e.g., Mon&ndash;Fri 9 AM&ndash;5 PM), custom slots, buffer times, minimum scheduling notice, and date-specific overrides (holidays or vacations).
              </li>
              <li>
                <strong>Invitee Booking Submissions</strong>: Full name, email address, meeting date/time, guest notes, and responses to any custom booking questions configured by the host (such as phone numbers or meeting objectives).
              </li>
              <li>
                <strong>OAuth Tokens</strong>: Encrypted integration access tokens and refresh tokens received from Google OAuth 2.0 to maintain background calendar synchronization.
              </li>
              <li>
                <strong>Contacts CRM Record</strong>: Invitee names and email addresses are automatically organized into the Host&rsquo;s private Contacts directory so the Host can view interaction history and schedule follow-up meetings.
              </li>
            </ul>
          </div>
        </section>

        {/* 5. How We Use Information */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">5. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>To compute real-time available time slots and prevent scheduling conflicts.</li>
            <li>To dispatch transactional emails: booking confirmations, calendar invites (<code className="text-xs">.ics</code> files), reschedule links, cancellation notices, and automated workflow reminder notifications.</li>
            <li>To facilitate password reset requests and account security verifications.</li>
            <li>To authenticate authorized account access and prevent unauthorized access or abuse.</li>
            <li>To deliver customer support and maintain system reliability.</li>
          </ul>
        </section>

        {/* 6. Subprocessors & Third-Party Service Providers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">6. Third-Party Service Providers</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            We share data only with trusted infrastructure providers strictly necessary to deliver the service under confidentiality agreements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-300 pt-1">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <strong>Google Cloud & Google APIs</strong>: Google Calendar sync, Google Meet generation, and OAuth 2.0 authentication.
            </div>
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <strong>Render & Vercel</strong>: Cloud application hosting and global Content Delivery Network (CDN).
            </div>
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <strong>MongoDB Atlas</strong>: Highly secure, encrypted enterprise database for storing application state.
            </div>
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <strong>Hostinger Email Delivery</strong>: Encrypted transactional email delivery for booking confirmations and reminders.
            </div>
          </div>
        </section>

        {/* 7. Cookies and Local Storage */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">7. Cookies & Local Storage</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Meet does <strong>not</strong> use invasive third-party tracking or advertising cookies. We use browser <code className="text-xs">localStorage</code> strictly to store your active authentication session JSON Web Token (JWT) and your dark/light theme display preference.
          </p>
        </section>

        {/* 8. Data Security & Encryption */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">8. Data Security & Storage</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            We implement industry-standard technical and organizational security measures:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
            <li><strong>Encryption in Transit</strong>: All data transmitted between your browser and our servers is encrypted using modern TLS 1.3 / HTTPS.</li>
            <li><strong>Encryption at Rest</strong>: Stored databases, backups, and OAuth access/refresh tokens are encrypted using AES-256 bit encryption.</li>
            <li><strong>Password Protection</strong>: Passwords are salted and hashed cryptographically; we never store plain-text passwords.</li>
          </ul>
        </section>

        {/* 9. Your Rights & How to Disconnect */}
        <section className="space-y-4 bg-zinc-100 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">9. Your Rights & Data Control</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            You hold complete control over your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>
              <strong>Disconnect Google Integration</strong>: You can instantly revoke and delete your Google Calendar integration at any time from the <strong>Integrations</strong> page in your dashboard.
            </li>
            <li>
              <strong>Google Account Revocation</strong>: You can revoke Meet&rsquo;s access directly from your Google Security Settings at{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">
                https://myaccount.google.com/permissions
              </a>.
            </li>
            <li>
              <strong>Data Access, Export & Erasure</strong>: You have the right to request a copy of your stored data or request immediate, permanent deletion of your account and all associated bookings by emailing us at <a href="mailto:team@alizesoftwareservices.com" className="text-blue-600 underline">team@alizesoftwareservices.com</a> or using the Account Settings page.
            </li>
          </ul>
        </section>

        {/* 10. Contact Information */}
        <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">10. Contact & Privacy Inquiries</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            For privacy inquiries, data deletion requests, or questions regarding Google API compliance, please contact our Data Protection Team:
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-700 dark:text-zinc-300">
            <p><strong>Alize Software Services Private Limited</strong></p>
            <p>Application: Meet (<a href="https://meet.alizesoftwareservices.com" className="text-blue-600 underline">meet.alizesoftwareservices.com</a>)</p>
            <p>Official Website: <a href="https://alizesoftwareservices.com" className="text-blue-600 underline">https://alizesoftwareservices.com</a></p>
            <p>Email: <a href="mailto:team@alizesoftwareservices.com" className="text-blue-600 underline">team@alizesoftwareservices.com</a></p>
          </div>
        </section>

      </div>
    </div>
  );
}
