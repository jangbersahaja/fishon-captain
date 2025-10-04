/**
 * Z-Index Design System
 *
 * Centralized z-index values to prevent layout conflicts.
 * Values are organized by layers and use consistent increments.
 */

export const zIndex = {
  // Base content layer (z-0 to z-9)
  base: 0,
  content: 1,
  raised: 2,

  // Interactive elements (z-10 to z-19)
  interactive: 10,
  hover: 11,
  focus: 12,

  // Positioned elements (z-20 to z-39)
  dropdown: 20,
  tooltip: 25,
  popover: 30,
  sticky: 35,

  // Navigation layer (z-40 to z-59)
  navigation: 40,
  navigationDropdown: 50,
  subNavigation: 45,

  // Overlay layer (z-60 to z-79)
  overlay: 60,
  offlineBanner: 70,
  notification: 75,

  // Modal layer (z-80 to z-99)
  backdrop: 80,
  modal: 90,
  modalContent: 95,

  // Critical layer (z-100+)
  toast: 100,
  loading: 110,
  debug: 999,
} as const;

// Type for z-index keys
export type ZIndexKey = keyof typeof zIndex;

// Helper function to get z-index value
export const getZIndex = (key: ZIndexKey): number => zIndex[key];

// Tailwind-compatible z-index classes
export const zIndexClasses = {
  base: "z-0",
  content: "z-[1]",
  raised: "z-[2]",

  interactive: "z-10",
  hover: "z-[11]",
  focus: "z-[12]",

  dropdown: "z-20",
  tooltip: "z-[25]",
  popover: "z-30",
  sticky: "z-[35]",

  navigation: "z-40",
  subNavigation: "z-[45]",
  navigationDropdown: "z-50",

  overlay: "z-60",
  offlineBanner: "z-[70]",
  notification: "z-[75]",

  backdrop: "z-[80]",
  modal: "z-[90]",
  modalContent: "z-[95]",

  toast: "z-[100]",
  loading: "z-[110]",
  debug: "z-[999]",
} as const;
