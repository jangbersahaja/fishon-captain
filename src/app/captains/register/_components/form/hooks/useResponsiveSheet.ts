import { useCallback, useEffect, useState } from "react";

type ResponsiveSheetState = {
  isDesktop: boolean;
  mobileSheetOpen: boolean;
  openMobileSheet: () => void;
  closeMobileSheet: () => void;
  setMobileSheetOpen: (value: boolean) => void;
};

export function useResponsiveSheet(): ResponsiveSheetState {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpenState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setMobileSheetOpenState(isDesktop);
  }, [isDesktop]);

  const openMobileSheet = useCallback(() => {
    setMobileSheetOpenState(true);
  }, []);

  const closeMobileSheet = useCallback(() => {
    setMobileSheetOpenState(false);
  }, []);

  return {
    isDesktop,
    mobileSheetOpen,
    openMobileSheet,
    closeMobileSheet,
    setMobileSheetOpen: setMobileSheetOpenState,
  };
}
