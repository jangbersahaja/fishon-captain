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
      <div className="flex flex-col max-h-[calc(100vh-64px)] h-[calc(100vh-64px)]">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setIsDrawerOpen(true)} />

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
            className={`hidden max-h-[calc(100vh-64px)] overflow-y-auto md:block md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
          >
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              <DashboardNav />
            </Suspense>
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full max-h-[calc(100vh-120px)] md:max-h-[calc(100vh-64px)] overflow-y-auto pb-20 overflow-hidden bg-slate-50/60 md:pb-0">
            {children}
          </main>
          {/* Mobile Spacer */}
          <div className="hidden h-20 md:block" aria-hidden="true"></div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onMoreClick={() => setIsDrawerOpen(true)} />
      </div>
    </ToastProvider>
  );
}
