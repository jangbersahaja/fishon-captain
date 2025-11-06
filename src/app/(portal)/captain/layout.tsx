"use client";

import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { NavigationDrawer } from "@/components/navigation/NavigationDrawer";
import { ToastProvider } from "@/components/toast/ToastContext";
import { zIndexClasses } from "@/config/zIndex";
import React, { Suspense, useState } from "react";
import { DashboardNav } from "./nav";

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={() => setIsDrawerOpen(true)}
          unreadNotifications={0} // TODO: Get from API
        />

        {/* Navigation Drawer */}
        <NavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          captainName="Captain" // TODO: Get from session
          captainEmail="" // TODO: Get from session
        />

        <div className="flex flex-col flex-1 md:flex-row">
          {/* Desktop Sidebar */}
          <aside
            className={`hidden md:block md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
          >
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              <DashboardNav />
            </Suspense>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-slate-50/60 min-h-[calc(100vh-0px)] w-full overflow-hidden pb-20 md:pb-0">
            {children}
          </main>

          {/* Right Sidebar (Desktop) */}
          <aside
            className={`hidden 2xl:flex md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 ${zIndexClasses.content}`}
          />
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onMoreClick={() => setIsDrawerOpen(true)} />
      </div>
    </ToastProvider>
  );
}
