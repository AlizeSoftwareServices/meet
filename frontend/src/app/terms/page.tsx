import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - Meet by Alize Software Services',
  description: 'Terms of Service and Usage Agreement for Meet scheduling platform.',
};

export default function TermsOfServicePage() {
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
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Terms of Service
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Effective Date: November 2026 &bull; Alize Software Services Private Limited
          </p>
        </div>

        {/* Acceptance */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            By accessing or using <strong>Meet</strong> at <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">meet.alizesoftwareservices.com</code>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        {/* Service Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Meet provides an online automated scheduling platform that enables professionals, teams, and enterprises to share real-time calendar availability, book appointments, connect video conferencing services, and manage communications with invitees.
          </p>
        </section>

        {/* User Accounts & Responsibilities */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">3. User Accounts & Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>You must provide accurate, current, and complete registration information.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials and tokens.</li>
            <li>You agree not to use the service for unsolicited spam, harassment, or unlawful activities.</li>
          </ul>
        </section>

        {/* Third-Party Integrations */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">4. Third-Party Integrations (Google Calendar & Meet)</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            When connecting your account to third-party services like Google Calendar or Google Meet, you authorize Meet to interact with those services solely to read availability and create calendar bookings as configured by your account preferences.
          </p>
        </section>

        {/* Termination */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">5. Termination</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in abusive scheduling behavior. You may terminate your account at any time via your dashboard settings.
          </p>
        </section>

        {/* Contact Information */}
        <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">6. Inquiries & Support</h2>
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
