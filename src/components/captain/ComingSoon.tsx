import Link from "next/link";

export function ComingSoon(props: { feature: string; description?: string }) {
  const { feature, description } = props;
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ec2227]/10 text-[#ec2227] mb-6 text-2xl font-bold">
        {feature.charAt(0)}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {feature} is coming soon
      </h1>
      <p className="mt-4 text-slate-600 text-sm sm:text-base">
        {description || "We're building this feature. Stay tuned."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/captain"
          className="inline-flex items-center rounded-full bg-[#ec2227] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d81e23]"
        >
          Back to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
