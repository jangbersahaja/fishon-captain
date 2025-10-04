import Link from "next/link";

export default function SimpleFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#ec2227]">Fishon</span>
            <span className="text-sm text-slate-500">Captains</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Privacy
            </Link>
            <a
              href="mailto:support@fishon.my"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Support
            </a>
          </div>

          <p className="text-xs text-slate-500">
            © {currentYear} Fishon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
