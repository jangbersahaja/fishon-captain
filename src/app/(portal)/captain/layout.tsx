import { zIndexClasses } from "@/config/zIndex";
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
        <aside
          className={`md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
        >
          <DashboardNav />
        </aside>
        <main className="flex-1 bg-slate-50/60 min-h-[calc(100vh-0px)] w-full overflow-hidden">
          {children}
        </main>
        <aside
          className={`hidden 2xl:flex md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 ${zIndexClasses.content}`}
        />
      </div>
    </div>
  );
}
