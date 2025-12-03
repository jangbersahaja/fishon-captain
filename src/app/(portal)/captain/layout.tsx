"use client";

import { GroupHeader } from "@/components/navigation/GroupHeader";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NavigationDrawer } from "@/components/navigation/NavigationDrawer";
import { ToastProvider } from "@/components/toast/ToastContext";
import { zIndexClasses } from "@/config/zIndex";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import React, { Suspense, useState } from "react";
import { DashboardNav, navSections } from "./nav";

function CaptainLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAdminMode, adminUserId } = useEffectiveUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-auto">
      {/* Group Header (tabs for current group) */}
      <GroupHeader navSections={navSections} />

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        captainName={user?.name || "Captain"}
        captainEmail={user?.email || ""}
        captainImage={user?.image || undefined}
        isAdminMode={isAdminMode}
        adminUserId={adminUserId}
      />

      <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden h-full overflow-y-auto md:block md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${zIndexClasses.content}`}
        >
          <DashboardNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full h-full overflow-y-auto pb-18 bg-slate-50/60 md:pb-0">
          {children}
        </main>
        {/* Mobile Spacer */}
        <div className="hidden h-20 md:block" aria-hidden="true"></div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setIsDrawerOpen(true)} />
    </div>
  );
}

function LayoutFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-auto">
      <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
        {/* Desktop Sidebar Skeleton */}
        <aside
          className={`hidden h-full overflow-y-auto md:block md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white/70 ${zIndexClasses.content}`}
        >
          <div className="p-4">
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-100 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full h-full overflow-y-auto pb-18 bg-slate-50/60 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Suspense fallback={<LayoutFallback>{children}</LayoutFallback>}>
        <CaptainLayoutInner>{children}</CaptainLayoutInner>
      </Suspense>
    </ToastProvider>
  );
}
