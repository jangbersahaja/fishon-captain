import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-5xl">
          Thank You for Your Registration!
        </h1>

        <p className="mt-8 text-xl font-semibold text-[#EC2227] sm:text-2xl">
          Fishon.my — Malaysia’s #1 Fishing Charter Booking Platform.
        </p>

        <div className="flex flex-col gap-4 mt-10 sm:flex-row sm:items-center">
          <Link
            href="/captain"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition bg-white border rounded-full shadow-sm border-slate-300 text-slate-700 hover:border-slate-400 sm:text-base"
          >
            View captain dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
