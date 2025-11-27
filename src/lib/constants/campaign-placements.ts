/**
 * Campaign Placement Definitions
 *
 * These are the predefined placement slots available in fishon-market.
 * Each placement corresponds to an actual CampaignContainer component in the app.
 *
 * IMPORTANT: Adding a new placement here requires adding the corresponding
 * <CampaignContainer placementKey="..." /> component in fishon-market.
 */

export type PlacementPosition =
  | "RIGHT_SIDEBAR"
  | "LEFT_SIDEBAR"
  | "BOTTOM_FIXED"
  | "TOP_BANNER"
  | "MODAL_CENTER"
  | "INLINE_CONTENT";

export interface PlacementSlot {
  /** Unique placement key used in database */
  key: string;
  /** Human-readable label for the form */
  label: string;
  /** Which pages this placement appears on */
  pages: string[];
  /** Position in the page layout */
  position: PlacementPosition;
  /** Recommended devices for this placement */
  devices: ("DESKTOP" | "MOBILE" | "TABLET")[];
  /** Banner variant to use */
  variant: "card" | "bar" | "modal";
  /** Description for the admin UI */
  description: string;
  /** Whether placement is currently implemented in fishon-market */
  implemented: boolean;
}

/**
 * All available placement slots in fishon-market
 *
 * ✅ = Implemented and ready to use
 * 🚧 = Not yet implemented (component doesn't exist in fishon-market)
 */
export const PLACEMENT_SLOTS: PlacementSlot[] = [
  // ============================================
  // HOME PAGE PLACEMENTS
  // ============================================
  {
    key: "home-welcome-modal",
    label: "Home Welcome Modal",
    pages: ["home"],
    position: "MODAL_CENTER",
    devices: ["DESKTOP", "MOBILE", "TABLET"],
    variant: "modal",
    description:
      "Full-screen welcome modal shown after 5 seconds on homepage. Great for new user registration offers.",
    implemented: true,
  },
  // NOTE: "home-welcome-bar" was a legacy key that's been removed.
  // It was identical to "home-welcome-modal" and caused confusion.
  // Any existing campaigns using "home-welcome-bar" will still work
  // as they're stored in the database, but new campaigns should use
  // "home-welcome-modal" instead.

  // ============================================
  // SEARCH PAGE PLACEMENTS
  // ============================================
  {
    key: "search-sidebar",
    label: "Search Sidebar (Desktop)",
    pages: ["search"],
    position: "RIGHT_SIDEBAR",
    devices: ["DESKTOP"],
    variant: "card",
    description:
      "Sticky sidebar card on search results page. Supports up to 3 stacked banners. Great for registration incentives while browsing.",
    implemented: true,
  },
  {
    key: "search-bottom-bar",
    label: "Search Bottom Bar (Mobile)",
    pages: ["search"],
    position: "BOTTOM_FIXED",
    devices: ["MOBILE", "TABLET"],
    variant: "bar",
    description:
      "Fixed bottom bar on search page for mobile devices. Compact format with icon, text, and CTA.",
    implemented: true,
  },

  // ============================================
  // CHARTER DETAIL PAGE PLACEMENTS
  // ============================================
  {
    key: "charter-detail-sidebar",
    label: "Charter Detail Sidebar (Desktop)",
    pages: ["charter-detail"],
    position: "RIGHT_SIDEBAR",
    devices: ["DESKTOP"],
    variant: "card",
    description:
      "Sidebar card on charter detail page, below the booking widget. Supports up to 3 stacked banners.",
    implemented: true, // ✅ Added to charter detail page
  },
  {
    key: "charter-detail-bottom-bar",
    label: "Charter Detail Bottom Bar (Mobile)",
    pages: ["charter-detail"],
    position: "BOTTOM_FIXED",
    devices: ["MOBILE", "TABLET"],
    variant: "bar",
    description:
      "Fixed bottom bar on charter detail page for mobile. Shows above the booking CTA.",
    implemented: true, // ✅ Added to charter detail page
  },

  // ============================================
  // CHECKOUT / BOOKING FLOW PLACEMENTS
  // ============================================
  {
    key: "pre-checkout-modal",
    label: "Pre-Checkout Modal",
    pages: ["book"],
    position: "MODAL_CENTER",
    devices: ["DESKTOP", "MOBILE", "TABLET"],
    variant: "modal",
    description:
      "Modal shown before checkout confirmation. Last chance to offer registration benefits.",
    implemented: true, // ✅ Added to booking page
  },

  // ============================================
  // GLOBAL PLACEMENTS (ALL PAGES)
  // ============================================
  {
    key: "global-bottom-bar",
    label: "Global Bottom Bar (Mobile)",
    pages: ["home", "search", "charter-detail", "book"],
    position: "BOTTOM_FIXED",
    devices: ["MOBILE", "TABLET"],
    variant: "bar",
    description:
      "Persistent bottom bar across all pages on mobile. Use sparingly - can be intrusive.",
    implemented: true, // ✅ Added to locale layout
  },
];

/**
 * Get only implemented placements (ready to use)
 */
export const IMPLEMENTED_PLACEMENTS = PLACEMENT_SLOTS.filter(
  (p) => p.implemented
);

/**
 * Get placements by page
 */
export function getPlacementsForPage(page: string): PlacementSlot[] {
  return PLACEMENT_SLOTS.filter((p) => p.pages.includes(page));
}

/**
 * Get placement by key
 */
export function getPlacementByKey(key: string): PlacementSlot | undefined {
  return PLACEMENT_SLOTS.find((p) => p.key === key);
}

/**
 * Placement positions with metadata (for form UI)
 */
export const PLACEMENT_POSITIONS: {
  value: PlacementPosition;
  label: string;
  description: string;
  devices: readonly ("DESKTOP" | "MOBILE" | "TABLET")[];
  variant: "card" | "bar" | "modal";
}[] = [
  {
    value: "RIGHT_SIDEBAR",
    label: "Right Sidebar",
    description: "Sticky sidebar on the right side of the page (desktop only)",
    devices: ["DESKTOP"] as const,
    variant: "card",
  },
  {
    value: "LEFT_SIDEBAR",
    label: "Left Sidebar",
    description: "Sidebar on the left side of the page",
    devices: ["DESKTOP"] as const,
    variant: "card",
  },
  {
    value: "BOTTOM_FIXED",
    label: "Bottom Fixed Bar",
    description: "Fixed bar at the bottom of the screen (mobile)",
    devices: ["MOBILE", "TABLET"] as const,
    variant: "bar",
  },
  {
    value: "TOP_BANNER",
    label: "Top Banner",
    description: "Banner at the top of the page content",
    devices: ["DESKTOP", "MOBILE", "TABLET"] as const,
    variant: "bar",
  },
  {
    value: "MODAL_CENTER",
    label: "Center Modal",
    description: "Overlay modal in the center of the screen",
    devices: ["DESKTOP", "MOBILE", "TABLET"] as const,
    variant: "modal",
  },
  {
    value: "INLINE_CONTENT",
    label: "Inline Content",
    description: "Embedded within page content",
    devices: ["DESKTOP", "MOBILE", "TABLET"] as const,
    variant: "card",
  },
];

/**
 * Page options with descriptions (for form UI)
 */
export const PAGE_OPTIONS: {
  value: string;
  label: string;
  description: string;
}[] = [
  {
    value: "home",
    label: "Home",
    description: "Main landing page",
  },
  {
    value: "search",
    label: "Search Results",
    description: "Charter search results page",
  },
  {
    value: "charter-detail",
    label: "Charter Detail",
    description: "Individual charter page",
  },
  {
    value: "book",
    label: "Booking Flow",
    description: "Checkout and payment pages",
  },
  {
    value: "account",
    label: "Account Pages",
    description: "User dashboard and settings",
  },
];
