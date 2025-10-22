"use client";
import DevPanel from "@/components/DevPanel";
import { createContext, useContext, useMemo, useState } from "react";

interface DevPanelContextValue {
  showDummies: boolean;
  toggleShowDummies: () => void;
  devMode: boolean;
}

const DevPanelContext = createContext<DevPanelContextValue | undefined>(
  undefined
);

export function DevPanelProvider({ children }: { children: React.ReactNode }) {
  // Only show DevPanel if NEXT_PUBLIC_DEV_MODE=1
  const devMode =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEV_MODE === "1";
  const [showDummies, setShowDummies] = useState(false);

  const value = useMemo(
    () => ({
      showDummies,
      toggleShowDummies: () => setShowDummies((v) => !v),
      devMode,
    }),
    [showDummies, devMode]
  );

  return (
    <DevPanelContext.Provider value={value}>
      {devMode && (
        <DevPanel
          onToggleShowDummies={value.toggleShowDummies}
          showDummies={showDummies}
        />
      )}
      {children}
    </DevPanelContext.Provider>
  );
}

export function useDevPanel() {
  const ctx = useContext(DevPanelContext);
  if (!ctx)
    throw new Error("useDevPanel must be used within a DevPanelProvider");
  return ctx;
}
