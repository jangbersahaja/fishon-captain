import { useDevPanel } from "@/components/DevPanelProvider";

import type { Draft } from "./RegistrationsClient";

export function useDummyDraftsFilter(drafts: Draft[]): Draft[] {
  const { showDummies } = useDevPanel();
  if (showDummies) return drafts;
  return drafts.filter((d) => !d.user?.displayName?.includes("[Dummy]"));
}
