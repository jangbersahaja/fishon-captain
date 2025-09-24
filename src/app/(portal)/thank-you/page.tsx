import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-5xl">
          Thank You for Your Registration!
        </h1>
        <p className="mt-4 text-lg text-gray-600 sm:text-xl">
          We will be contacting you as soon as our website is ready. See you
          soon.
        </p>

        <p className="mt-8 text-xl font-semibold text-[#EC2227] sm:text-2xl">
          Fishon.my — Malaysia’s #1 Fishing Charter Booking Platform.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#EC2227] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#d81e23] sm:text-base"
          >
            Back to homepage
          </Link>
          <Link
            href="/captain"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 sm:text-base"
          >
            View captain dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
