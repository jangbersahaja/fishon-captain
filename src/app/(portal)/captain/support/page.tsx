import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Support
      </h1>
      <p className="mt-4 text-sm text-slate-600">
        Need help? Reach out and we will get back as soon as possible.
      </p>
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Email</h2>
          <p className="mt-1 text-sm text-slate-600">support@fishon.my</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Knowledge base
          </h2>
          <p className="mt-2 text-xs text-slate-500">Coming soon</p>
        </div>
      </div>
      <Link
        href="/captain"
        className="mt-10 inline-flex items-center rounded-full bg-[#ec2227] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#d81e23]"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
