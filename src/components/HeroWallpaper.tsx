// src/components/HeroWallpaper.tsx
import Image, { StaticImageData } from "next/image";
import * as React from "react";

type Props = {
  /** Optional background image URL */
  src?: string | StaticImageData;
  /** Alt text for the background image (decorative by default) */
  alt?: string;
  /** Extra classes for sizing (e.g., h-[520px]) */
  className?: string;
  /** Next/Image priority */
  priority?: boolean;
  /** Optional overlay class; if omitted we render a subtle radial overlay */
  overlayClassName?: string;
  /** Children appear on top of the wallpaper */
  children?: React.ReactNode;
};

const DEFAULT_IMG = "/images/hero/hero-wallpaper.png";

export default function HeroWallpaper({
  src = DEFAULT_IMG,
  alt = "Fishing charter wallpaper",
  className = "h-[520px]",
  priority = false,
  overlayClassName,
  children,
}: Props) {
  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-none",
        className,
      ].join(" ")}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        className="object-cover"
        priority={priority}
      />
      <div
        className={
          overlayClassName ??
          "absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25),transparent_70%)]"
        }
        aria-hidden
      />
      {children ? (
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
