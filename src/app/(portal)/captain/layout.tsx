import React from "react";
import { DashboardNav } from "./nav";

export const dynamic = "force-dynamic";

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        <DashboardNav />
        <main className="flex-1 bg-slate-50/60 min-h-[calc(100vh-0px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
