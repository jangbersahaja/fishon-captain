import {
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="max-w-4xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Support & Help
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Need help? We&apos;re here to assist you with any questions or issues.
        </p>
      </div>

      {/* Contact Support Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Contact Support</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@fishon.my"
            className="flex items-start gap-4 p-5 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Email</h3>
              <p className="mt-1 text-sm text-slate-600">support@fishon.my</p>
              <p className="mt-1 text-xs text-slate-500">
                We respond within 24 hours
              </p>
            </div>
          </a>

          <a
            href="https://wa.me/60165304304"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="rounded-lg bg-green-100 p-2.5">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">WhatsApp</h3>
              <p className="mt-1 text-sm text-slate-600">+60 12-345 6789</p>
              <p className="mt-1 text-xs text-slate-500">
                Quick responses for urgent issues
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-5 bg-white border shadow-sm rounded-xl border-slate-200">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                Knowledge Base
              </h3>
              <p className="mt-1 text-sm text-slate-600">FAQs & Tutorials</p>
              <p className="mt-1 text-xs text-slate-500">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Common Questions Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Common Questions</h2>
        <div className="bg-white border divide-y shadow-sm rounded-xl border-slate-200 divide-slate-100">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              How do I update my charter information?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Go to your{" "}
              <Link
                href="/captain/charters"
                className="text-blue-600 hover:underline"
              >
                Charters page
              </Link>{" "}
              and click on the charter you want to edit. You can update photos,
              descriptions, pricing, and availability.
            </p>
          </div>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              How do I block dates on my calendar?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Visit your{" "}
              <Link
                href="/captain/calendar"
                className="text-blue-600 hover:underline"
              >
                Calendar
              </Link>{" "}
              and click on any date to block it. You can also check our{" "}
              <Link
                href="/en/tutorial/calendar"
                className="text-blue-600 hover:underline"
              >
                Calendar Tutorial
              </Link>{" "}
              for detailed instructions.
            </p>
          </div>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              When will I receive my payout?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Payouts are processed after the trip is completed. Check your{" "}
              <Link
                href="/captain/earnings"
                className="text-blue-600 hover:underline"
              >
                Earnings page
              </Link>{" "}
              for payout schedules and history.
            </p>
          </div>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              How do I respond to a booking request?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              When you receive a booking request, you&apos;ll get an email
              notification. Go to your{" "}
              <Link
                href="/captain/bookings"
                className="text-blue-600 hover:underline"
              >
                Bookings page
              </Link>{" "}
              to approve or decline the request within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Legal & Policies Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Legal & Policies</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/captain-terms"
            className="flex items-center gap-3 p-4 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="text-sm font-medium text-slate-700">
                Captain Terms of Service
              </h3>
              <p className="text-xs text-slate-500">
                Terms specific to charter operators
              </p>
            </div>
          </Link>

          <Link
            href="/terms"
            className="flex items-center gap-3 p-4 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="text-sm font-medium text-slate-700">
                Terms of Service
              </h3>
              <p className="text-xs text-slate-500">General platform terms</p>
            </div>
          </Link>

          <Link
            href="/privacy"
            className="flex items-center gap-3 p-4 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <Shield className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="text-sm font-medium text-slate-700">
                Privacy Policy
              </h3>
              <p className="text-xs text-slate-500">How we handle your data</p>
            </div>
          </Link>

          <Link
            href="/refund-policy"
            className="flex items-center gap-3 p-4 transition-colors bg-white border shadow-sm rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="text-sm font-medium text-slate-700">
                Refund Policy
              </h3>
              <p className="text-xs text-slate-500">
                Cancellation and refund guidelines
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Back to Dashboard */}
      <div className="pt-4">
        <Link
          href="/captain"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
