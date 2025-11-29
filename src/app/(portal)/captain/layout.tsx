"use client";

import { GroupHeader } from "@/components/navigation/GroupHeader";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NavigationDrawer } from "@/components/navigation/NavigationDrawer";
import { ToastProvider } from "@/components/toast/ToastContext";
import { zIndexClasses } from "@/config/zIndex";
import { useSession } from "next-auth/react";
import React, { Suspense, useState } from "react";
import { DashboardNav, navSections } from "./nav";

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const user = session?.user;

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen overflow-auto">
        {/* Group Header (tabs for current group) */}
        <Suspense fallback={null}>
          <GroupHeader navSections={navSections} />
        </Suspense>

        {/* Navigation Drawer */}
        <Suspense fallback={null}>
          <NavigationDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            captainName={user?.name || "Captain"}
            captainEmail={user?.email || ""}
            captainImage={user?.image || undefined}
          />
        </Suspense>

        <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
          {/* Desktop Sidebar */}
          <aside
            className={`hidden h-full overflow-y-auto md:block md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
          >
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              <DashboardNav />
            </Suspense>
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full h-full overflow-y-auto pb-18 bg-slate-50/60 md:pb-0">
            {children}
          </main>
          {/* Mobile Spacer */}
          <div className="hidden h-20 md:block" aria-hidden="true"></div>
        </div>

        {/* Mobile Bottom Navigation */}
        <Suspense fallback={null}>
          <MobileBottomNav onMoreClick={() => setIsDrawerOpen(true)} />
        </Suspense>
      </div>
    </ToastProvider>
  );
}
