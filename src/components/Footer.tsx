import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-4 lg:px-5">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold text-[#ec2227]">Fishon</span>
              <span className="text-sm text-slate-600">Captains</span>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Malaysia&apos;s first fishing & charter booking platform.
              Connecting captains with fishing enthusiasts for unforgettable
              marine adventures.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/captain"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Captain Portal
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.fishon.my"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/captain/support"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@fishon.my"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500">
              © {currentYear} Fishon. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">
                Made with ❤️ in Malaysia
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
