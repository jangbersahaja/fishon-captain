// UI helpers for List Your Business page
import { CheckCircle2 } from "lucide-react";

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 transition-all hover:border-[#EC2227]/50 hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative text-sm font-semibold">{value}</div>
      <div className="relative text-xs text-neutral-500">{label}</div>
    </div>
  );
}

export function Feature({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-[#EC2227]/50 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex gap-3 items-center">
        <Icon className="text-2xl text-[#ec2227] flex-shrink-0" />
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="relative mt-1 text-sm md:text-base text-neutral-700">
        {desc}
      </p>
    </div>
  );
}

export function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 md:p-7 lg:p-8 transition-all hover:border-[#EC2227]/50 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-[#EC2227]/10 text-sm md:text-base font-semibold text-[#EC2227]">
        {n}
      </div>
      <div className="relative mt-2 flex items-center gap-2">
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <p className="relative mt-1 text-sm md:text-base text-neutral-700">
        {desc}
      </p>
    </li>
  );
}

export function Plan({
  percent,
  name,
  points,
  highlight = false,
  disabled = false,
}: {
  percent: string;
  name: string;
  points: string[];
  highlight?: boolean;
  disabled?: boolean;
}) {
  const BRAND = "#EC2227";
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 md:p-7 lg:p-8 transition-all",
        highlight
          ? "border-[#EC2227] bg-[#EC2227]/5 hover:border-[#EC2227]/70 hover:shadow-lg"
          : "border-neutral-200 bg-white hover:border-[#EC2227]/50 hover:shadow-lg",
        disabled ? "opacity-40 bg-gray-600" : "",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex justify-between items-end">
        {disabled ? (
          <h1 className="text-lg md:text-xl font-bold">COMING SOON</h1>
        ) : (
          <h3 className="text-lg md:text-xl font-semibold">{name}</h3>
        )}
        {!disabled && (
          <div className="flex flex-col items-center">
            <div
              className="text-2xl md:text-3xl font-extrabold"
              style={{ color: highlight ? BRAND : "inherit" }}
            >
              {percent}
            </div>
            <span className="text-[10px] uppercase">Commission</span>
          </div>
        )}
      </div>
      <ul className="relative mt-3 space-y-2 text-sm md:text-base text-neutral-700">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 md:h-5 md:w-5 text-[#EC2227] flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Award({
  Icon,
  title,
  desc,
  accent = false,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 md:p-7 transition-all",
        accent
          ? "border-white/20 bg-white/10 hover:border-white/40 hover:shadow-lg"
          : "border-neutral-200 bg-white hover:border-[#EC2227]/50 hover:shadow-lg",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center gap-2">
        <Icon
          className={
            "h-5 w-5 md:h-6 md:w-6 flex-shrink-0" +
            (accent ? " text-white" : " text-[#EC2227]")
          }
        />
        <h3
          className={
            "font-semibold text-base md:text-lg" + (accent ? " text-white" : "")
          }
        >
          {title}
        </h3>
      </div>
      <p
        className={
          "relative mt-1 text-sm md:text-base" +
          (accent ? " text-white/90" : " text-neutral-700")
        }
      >
        {desc}
      </p>
    </div>
  );
}
