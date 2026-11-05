import Link from 'next/link';
import { Shield, ArrowLeft, Lock, CheckCircle2, Globe, Calendar, Mail } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - Meet by Alize Software Services',
  description: 'Privacy Policy and Google User Data disclosures for Meet scheduling platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
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
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Last Updated: November 2026 &bull; Alize Software Services Private Limited
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">1. Overview</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Welcome to <strong>Meet</strong>, operated by <strong>Alize Software Services Private Limited</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our website, scheduling application, and related services located at <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">meet.alizesoftwareservices.com</code>.
          </p>
        </section>

        {/* Google User Data & Limited Use Policy */}
        <section className="space-y-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-300 font-bold text-base">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3>2. Google API Services User Data Policy Compliance</h3>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Meet integrates with Google Calendar and Google Meet APIs to provide seamless scheduling. Our use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline font-semibold"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Specific Scopes & How We Use Google Data:
            </h4>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Google Calendar Read/Write (<code>calendar.events</code>)</strong>: Used strictly to check your free/busy availability to prevent double-booking, and to automatically insert scheduled bookings with conference links into your primary Google Calendar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Google Meet Generation</strong>: Automatically generates unique, secure Google Meet video conference links for meetings scheduled through our platform.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>No Human Reading</strong>: No humans at Meet read or inspect your private Google Calendar entries or personal event descriptions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>No Advertising or Sale</strong>: Your Google user data is never sold, leased, or transferred to third parties or data brokers for advertising or marketing purposes.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Information We Collect */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">3. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li><strong>Account Information</strong>: Name, email address, password hash, profile avatar, company name, and timezone when you register.</li>
            <li><strong>Scheduling & Booking Information</strong>: Event type details, meeting titles, durations, guest names, guest email addresses, answers to custom booking questions, and booking timestamps.</li>
            <li><strong>Integration Tokens</strong>: OAuth access tokens and refresh tokens necessary to maintain synchronization with your connected Google Calendar or third-party CRM.</li>
          </ul>
        </section>

        {/* Data Security & Retention */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">4. Data Security & Storage</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            All user data and integration credentials are encrypted in transit using Transport Layer Security (TLS 1.3/HTTPS) and encrypted at rest in high-availability enterprise database clusters. Access tokens are stored securely and refreshed automatically via sanctioned OAuth flows.
          </p>
        </section>

        {/* Revoking Access & User Rights */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">5. How to Disconnect or Revoke Access</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            You maintain full control over your connected accounts at all times:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>You can disconnect your Google Calendar integration at any time directly from the <strong>Integrations</strong> tab in your Meet dashboard.</li>
            <li>You can also revoke Meet&rsquo;s access directly from your Google Account security portal at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-blue-600 underline">https://myaccount.google.com/permissions</a>.</li>
            <li>You may request complete account deletion and erasure of all stored data by contacting our support team or using the Account Settings page.</li>
          </ul>
        </section>

        {/* Contact Information */}
        <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">6. Contact Us</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            If you have questions, feedback, or data privacy requests, please contact:
          </p>
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 text-xs space-y-1 font-mono text-zinc-700 dark:text-zinc-300">
            <p><strong>Alize Software Services Private Limited</strong></p>
            <p>Email: <a href="mailto:team@alizesoftwareservices.com" className="text-blue-600 underline">team@alizesoftwareservices.com</a></p>
            <p>Website: <a href="https://alizesoftwareservices.com" className="text-blue-600 underline">https://alizesoftwareservices.com</a></p>
          </div>
        </section>

      </div>
    </div>
  );
}
