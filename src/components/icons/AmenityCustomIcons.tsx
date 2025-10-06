import * as React from "react";

/* ------------------------------------------------------------------
   🎣  FishOn Amenity Icon System (Duotone)
   ------------------------------------------------------------------
   Palette:
   --ink      → dark navy outline (#0F172A)
   --tint     → soft red tint (#FDE8E9)
   --primary  → FishOn red accent (#EC2227)

   Shared base: IconBase()
   All icons: 36x36 viewBox, strokeWidth 1.1
------------------------------------------------------------------ */

export const PALETTE = {
  ink: "#0F172A",
  primary: "#EC2227",
  tint: "#FDE8E9",
};

export const IconBase = ({
  size = 36,
  strokeWidth = 1.1,
  ink = PALETTE.ink,
  primary = PALETTE.primary,
  tint = PALETTE.tint,
  label,
  children,
  ...rest
}: React.PropsWithChildren<
  Omit<React.SVGProps<SVGSVGElement>, "strokeWidth"> & {
    size?: number;
    ink?: string;
    primary?: string;
    tint?: string;
    strokeWidth?: number | string;
    label?: string;
  }
>) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={label}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <g
      style={
        {
          ["--ink" as string]: ink,
          ["--primary" as string]: primary,
          ["--tint" as string]: tint,
        } as React.CSSProperties
      }
      strokeWidth={strokeWidth}
    >
      {children}
    </g>
  </svg>
);

/* ------------------------------------------------------------------
   Individual Icons
------------------------------------------------------------------ */

// 🎣 Rod & Reel
export const RodReelIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Rod & reel" {...props}>
    <circle
      cx="10.2"
      cy="25.6"
      r="4.1"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path d="M5 29 L13 21 L31 6" stroke="var(--ink)" />
    <path d="M3.8 30.2 L7.2 26.8" stroke="var(--ink)" />
    <circle cx="15.4" cy="18.6" r="1.1" fill="white" stroke="var(--ink)" />
    <circle cx="20.2" cy="14" r="1.1" fill="white" stroke="var(--ink)" />
    <circle cx="25.8" cy="9.2" r="1.1" fill="white" stroke="var(--ink)" />
    <path d="M11.9 24 L13.8 22.1" stroke="var(--ink)" />
    <path d="M8.7 27.4 L6.7 29.4" stroke="var(--primary)" />
    <circle cx="6.1" cy="30" r="0.9" fill="var(--primary)" stroke="none" />
    <path d="M31 6 C34 8.5 34.2 14.5 30 16.8" stroke="var(--primary)" />
    <path d="M30 16.8 c-2.2 2.4 0.8 5.2 3.2 3.4" stroke="var(--ink)" />
    <path d="M33.2 20.2 l2 -0.9" stroke="var(--ink)" />
  </IconBase>
);

// 🪱 Live Bait (bucket)
export const LiveBaitIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Live bait" {...props}>
    <path
      d="M5 12 H31 V27 C31 29.5,29 31.5,26.5 31.5 H9.5 C7 31.5,5 29.5,5 27 V12 Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path d="M7 12 C8.5 6.5,27.5 6.5,29 12" stroke="var(--ink)" />
    <path
      d="M7 18 C12 20,18 20,23 18 C27 16.5,29 16.5,31 18"
      stroke="var(--primary)"
    />
    <circle cx="12" cy="21.2" r="1.2" fill="white" stroke="var(--ink)" />
    <circle cx="16.2" cy="22.8" r="1.0" fill="white" stroke="var(--ink)" />
    <circle cx="20.4" cy="21.8" r="1.1" fill="white" stroke="var(--ink)" />
    <path
      d="M21 22 c1.8 -1.2 3.8 -1.2 5.4 0 c0.8 0.6 0.8 1.4 0 2 c-1.6 1.2 -3.6 1.2 -5.4 0 Z"
      fill="var(--ink)"
      stroke="none"
    />
  </IconBase>
);

// 🎣 Lure
export const LureIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Lure" {...props}>
    <path
      d="M6 18 C10 11,22 10,32 15 C34 16.5,34 19.5,32 21 C22 26,10 25,6 18 Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <circle cx="3.8" cy="18" r="1.2" fill="white" stroke="var(--ink)" />
    <path d="M9 17.8 C14 15.5,22 17,27 20" stroke="var(--primary)" />
    <path
      d="M18 22.4 v5 m0 -0.1 c-1.6 2 0.8 4 2.6 2.6 m-2.6 -2.6 c1.6 2 4 -0.8 2.6 -2.6"
      stroke="var(--ink)"
    />
    <path
      d="M26 20.6 v4.5 m0 -0.1 c-1.4 1.8 0.8 3.6 2.2 2.4 m-2.2 -2.4 c1.4 1.8 3.6 -0.8 2.4 -2.2"
      stroke="var(--ink)"
    />
  </IconBase>
);

// ⚓ Terminal Tackle (45°)
export const TerminalTackleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Terminal tackle" {...props}>
    <line x1="6" y1="28" x2="30" y2="4" stroke="var(--ink)" />
    <circle cx="9.5" cy="24.5" r="2.6" fill="var(--tint)" stroke="var(--ink)" />
    <path d="M11.8 22.4 l2 -2 l2 2 l-2 2 Z" stroke="var(--ink)" />
    <ellipse
      cx="18"
      cy="16.5"
      rx="3.2"
      ry="3"
      fill="var(--tint)"
      stroke="var(--ink)"
      transform="rotate(-45 18 16.5)"
    />
    <line x1="21.5" y1="13" x2="25" y2="9.5" stroke="var(--ink)" />
    <path d="M25 9.5 c2.5 3 6 2 7.5 -0.4" stroke="var(--ink)" />
    <path d="M31.8 9 l2 -1" stroke="var(--primary)" />
  </IconBase>
);

// 🍱 Packed Meal Bag
export const MealsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Packed food" {...props}>
    {/* Front panel */}
    <rect
      x="5"
      y="12"
      width="22"
      height="20"
      rx="1.2"
      fill="var(--tint)"
      stroke="var(--ink)"
    />

    {/* Side gusset */}
    <path
      d="M27 12 L32 9 V28 c0 2.1 -1.7 4 -3.8 4 H27 Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path d="M29.2 10.4 V30.6" stroke="var(--ink)" opacity="0.6" />

    {/* Top flap */}
    <path d="M7 12 L11 8 H25 L29 12 Z" fill="var(--tint)" stroke="var(--ink)" />

    {/* Handle area */}
    <rect
      x="10"
      y="6.2"
      width="16"
      height="5.2"
      rx="2.2"
      fill="none"
      stroke="var(--ink)"
    />
    <rect
      x="15"
      y="7.6"
      width="6"
      height="2.2"
      rx="1.1"
      fill="none"
      stroke="var(--ink)"
    />

    {/* Badge circle */}
    <circle cx="16" cy="22" r="6.2" fill="white" stroke="var(--ink)" />
    <circle
      cx="16"
      cy="22"
      r="6.2"
      fill="none"
      stroke="var(--primary)"
      strokeWidth={0.8}
      opacity="0.65"
    />

    {/* Utensils inside badge */}
    {/* Spoon */}
    <path
      d="M13.5 19.4
         c0 -1.1 0.8 -2 1.8 -2
         s1.8 0.9 1.8 2
         c0 0.8 -0.5 1.4 -1.2 1.7 v4.4
         M15.3 25.5 v0"
      fill="none"
      stroke="var(--ink)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Fork */}
    <path
      d="M19.8 18 v2.1
         M21.2 18 v2.1
         M22.6 18 v2.1
         M21.2 20.1 v5.6"
      fill="none"
      stroke="var(--ink)"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconBase>
);

// 🍪 Snacks (pouch)
export const SnacksIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Snacks" {...props}>
    <rect
      x="6.5"
      y="11.5"
      width="19.5"
      height="20.5"
      rx="1.4"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path
      d="M26 11.5 L31 9.2 V29.3 c0 2 -1.6 3.7 -3.6 3.7 H26 Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path d="M28.2 10.6 V30.4" stroke="var(--ink)" opacity="0.6" />
    <rect
      x="6.5"
      y="10"
      width="19.5"
      height="3"
      rx="1.2"
      fill="white"
      stroke="var(--ink)"
    />
    <path d="M8.2 10.2 l1.4 1.2 M10 10.2 l1.4 1.2" stroke="var(--ink)" />
    <circle cx="16.2" cy="22.2" r="5.6" fill="white" stroke="var(--ink)" />
    <circle
      cx="16.2"
      cy="22.2"
      r="5.6"
      fill="none"
      stroke="var(--primary)"
      strokeWidth={0.8}
      opacity="0.65"
    />
    <path
      d="M12.8 22.2 c1.2 -1 2.4 -1 3.6 0 c1.2 1 2.4 1 3.6 0"
      stroke="var(--ink)"
    />
  </IconBase>
);

// 🥤 Drinks (can + bottle)
export const DrinksIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Drinks (can + bottle)" {...props}>
    <path
      d="M6 13 v14 c0 2.4 2.5 4 6.2 4 s6.2 -1.6 6.2 -4 V13"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path
      d="M6 13 c0 -1 2.5 -1.8 6.2 -1.8 s6.2 0.8 6.2 1.8"
      stroke="var(--ink)"
    />
    <path d="M8.5 12 h7.4" stroke="var(--ink)" />
    <path
      d="M12.2 12 c0.9 0 1.6 -0.7 1.6 -1.4 s-0.7 -1.4 -1.6 -1.4"
      stroke="var(--primary)"
    />
    <path d="M8 19 c2.5 1.6 6 1.6 9 0" stroke="var(--primary)" />
    <path
      d="M21 7 h3 c1.2 0 2.2 1 2.2 2.2 v1.8 c0 .5 .2 1 .6 1.4 c1.8 1.8 3 4.3 3 7 V28
         c0 2.2 -1.8 4 -4 4 H21 c-2.2 0 -4 -1.8 -4 -4 V19
         c0 -2.7 1.2 -5.2 3 -7 c.4 -.4 .6 -.9 .6 -1.4 V9.2
         c0 -1.2 1 -2.2 2.2 -2.2 Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path d="M17.8 18.2 H30.8" stroke="var(--ink)" />
    <rect
      x="21"
      y="5.4"
      width="6"
      height="2.2"
      rx="0.6"
      fill="white"
      stroke="var(--ink)"
    />
    <path d="M20.4 23 c2.8 1.2 5.6 1.2 8.4 0" stroke="var(--primary)" />
  </IconBase>
);

// 🦺 Life Jacket
export const LifeJacketIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Life jacket" {...props}>
    {/* Vest body */}
    <path
      d="
        M9.2 30
        V14.1
        c0-3.4 1.6-6.1 4.6-7.4
        L16 5.5
        v-1.5
        c2 .6 4 .6 6 0
        v1.5
        l2.2 1.2
        c3 1.3 4.6 4 4.6 7.4
        V30
        c0 .6-.4 1-1 1H10.2
        c-.6 0-1-.4-1-1Z"
      fill="var(--tint)"
      stroke="var(--ink)"
    />

    {/* Deeper neck ring */}
    <path d="M13.2 8.6 c2.2-2 7.4-2 9.6 0" fill="none" stroke="var(--ink)" />

    {/* Center split */}
    <line x1="18" y1="11.2" x2="18" y2="30" stroke="var(--ink)" />

    {/* Bow tie cords */}
    <path d="M18 13.6 v3.4" stroke="var(--ink)" />
    <path d="M18 15.4 c-2.2-1.6-3.6-1.6-4.2-.8" stroke="var(--ink)" />
    <path d="M18 15.4 c2.2-1.6 3.6-1.6 4.2-.8" stroke="var(--ink)" />
    <path d="M18 16.8 c-1.2.9-1.2 1.5 0 2.4" stroke="var(--ink)" />
    <path d="M18 16.8 c1.2.9 1.2 1.5 0 2.4" stroke="var(--ink)" />

    {/* Waist strap (blue) */}
    <rect
      x="8.8"
      y="20.1"
      width="18.4"
      height="3.1"
      rx="1.2"
      fill="#1E40AF"
      stroke="var(--ink)"
    />

    {/* Buckles (yellow) */}
    <rect
      x="14.2"
      y="20.1"
      width="3.4"
      height="3.1"
      rx="0.6"
      fill="var(--primary)"
      stroke="var(--ink)"
    />
    <rect
      x="18.4"
      y="20.1"
      width="3.4"
      height="3.1"
      rx="0.6"
      fill="var(--primary)"
      stroke="var(--ink)"
    />

    {/* Bottom cords */}
    <path d="M17 29.2 l-2 3 M19 29.2 l2 3" stroke="var(--ink)" />
  </IconBase>
);

// 🎒 Default (generic badge)
export const AmenityDefaultIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconBase label="Default amenity" {...props}>
    <rect
      x="6"
      y="6"
      width="24"
      height="24"
      rx="4"
      fill="var(--tint)"
      stroke="var(--ink)"
    />
    <path
      d="M18 11 v14 M11 18 h14 M13.5 13.5 l9 9 M22.5 13.5 l-9 9"
      stroke="var(--primary)"
    />
  </IconBase>
);
