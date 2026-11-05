import Link from 'next/link';
import { FileText, ArrowLeft, Shield, AlertTriangle, CheckCircle2, Lock, Scale, Ban, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - Meet by Alize Software Services',
  description: 'Terms of Service, acceptable use policy, and user agreement for Meet scheduling platform.',
};

export default function TermsOfServicePage() {
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
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Terms of Service
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Effective Date: November 5, 2026 &bull; Alize Software Services Private Limited
              </p>
            </div>
          </div>
        </div>

        {/* 1. Acceptance */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>1. Agreement to Terms</span>
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Host&rdquo;, or &ldquo;Invitee&rdquo;) and <strong>Alize Software Services Private Limited</strong> (&ldquo;Alize&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) concerning your access to and use of <strong>Meet</strong> located at <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">meet.alizesoftwareservices.com</code>.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            By creating an account, connecting a calendar, scheduling an appointment, or using any feature of Meet, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must immediately discontinue use of the service.
          </p>
        </section>

        {/* 2. Description of the Service */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Meet provides an automated online appointment scheduling platform designed to eliminate scheduling friction. The platform offers:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
            <li>Customizable Event Types (one-on-one meetings, group events, collective team scheduling, round-robin allocation).</li>
            <li>Real-time calendar conflict detection and synchronization with Google Calendar.</li>
            <li>Automated Google Meet video conferencing generation.</li>
            <li>Configurable working hours, timezone auto-conversion, and date-specific availability overrides.</li>
            <li>Custom booking questions to collect attendee information prior to meetings.</li>
            <li>Automated email workflows for meeting confirmations, calendar invites (<code className="text-xs">.ics</code>), reminders, and follow-ups.</li>
            <li>Mini-CRM Contacts directory to manage interaction history with invitees.</li>
          </ul>
        </section>

        {/* 3. Account Eligibility & Responsibilities */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">3. User Accounts & Security</h2>
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              <strong>Eligibility</strong>: You must be at least 18 years of age or possess legal capacity in your jurisdiction to create an account.
            </p>
            <p>
              <strong>Account Confidentiality</strong>: You are responsible for safeguarding your login credentials and integration tokens. You agree to notify us immediately of any unauthorized access to your account.
            </p>
            <p>
              <strong>Accurate Information</strong>: You agree to provide true, current, and accurate registration details and maintain updated profile information.
            </p>
          </div>
        </section>

        {/* 4. Acceptable Use Policy */}
        <section className="space-y-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-300 font-bold text-base">
            <Ban className="w-5 h-5 text-red-600" />
            <h3>4. Acceptable Use Policy (Prohibited Conduct)</h3>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            You agree not to misuse the Meet platform. Prohibited activities include, but are not limited to:
          </p>
          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">&bull;</span>
              <span>Distributing unsolicited bulk messages, spam, phishing links, or fraudulent meeting invitations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">&bull;</span>
              <span>Attempting to circumvent, breach, or tamper with security controls, authentication tokens, or API rate limits.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">&bull;</span>
              <span>Using automated bots or web scrapers to harvest email addresses or submit falsified booking requests.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">&bull;</span>
              <span>Impersonating another person, business, or entity without authorization.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">&bull;</span>
              <span>Using the service to store, transmit, or promote illegal, defamatory, or harmful content.</span>
            </li>
          </ul>
        </section>

        {/* 5. Third-Party Services & Integrations */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">5. Third-Party Services (Google Calendar & Meet)</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Meet integrates with third-party platforms, particularly Google Cloud, Google Calendar, and Google Meet APIs. Your use of these third-party services is subject to their respective terms and privacy policies.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            While we strive for 99.9% uptime and dependable synchronization, Meet is not liable for service interruptions, API downtimes, or changes enacted by third-party providers outside our reasonable control.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">6. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Our Property</strong>: The Meet platform, including its software code, UI designs, brand assets, logos, and documentation, is the exclusive intellectual property of Alize Software Services Private Limited, protected by copyright and intellectual property laws.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <strong>Your Content</strong>: You retain all ownership rights to the profile data, event descriptions, notes, and custom questions you publish. You grant Meet a non-exclusive license solely to process and display this information to deliver the scheduling functionality.
          </p>
        </section>

        {/* 7. Disclaimer of Warranties */}
        <section className="space-y-4 bg-zinc-100 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>7. Warranty Disclaimer</span>
          </h2>
          <p className="text-xs uppercase tracking-wide leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono">
            THE MEET PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, COMPLETELY ERROR-FREE, OR SECURE AT ALL TIMES.
          </p>
        </section>

        {/* 8. Limitation of Liability */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">8. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            To the maximum extent permitted by applicable law, in no event shall Alize Software Services Private Limited, its directors, employees, or agents be liable for any indirect, punitive, incidental, special, or consequential damages (including loss of business, profits, or data) arising out of or related to your use of or inability to use the scheduling platform.
          </p>
        </section>

        {/* 9. Termination */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">9. Termination & Account Cancellation</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            You may terminate your account at any time via your dashboard settings or by contacting our team. We reserve the right to suspend or terminate access to accounts that violate these Terms or engage in fraudulent activities without prior notice.
          </p>
        </section>

        {/* 10. Governing Law */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">10. Governing Law & Jurisdiction</h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles. Any legal actions or disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>
        </section>

        {/* 11. Contact Details */}
        <section className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">11. Inquiries & Legal Notices</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            If you have questions regarding these Terms of Service or require legal notices, please contact:
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-700 dark:text-zinc-300">
            <p><strong>Alize Software Services Private Limited</strong></p>
            <p>Platform: Meet (<a href="https://meet.alizesoftwareservices.com" className="text-blue-600 underline">meet.alizesoftwareservices.com</a>)</p>
            <p>Corporate Website: <a href="https://alizesoftwareservices.com" className="text-blue-600 underline">https://alizesoftwareservices.com</a></p>
            <p>Email: <a href="mailto:team@alizesoftwareservices.com" className="text-blue-600 underline">team@alizesoftwareservices.com</a></p>
          </div>
        </section>

      </div>
    </div>
  );
}
