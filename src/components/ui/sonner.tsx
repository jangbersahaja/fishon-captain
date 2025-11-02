"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const [position, setPosition] = useState<"bottom-right" | "bottom-center">(
    "bottom-right"
  );

  useEffect(() => {
    const handleResize = () => {
      // Use bottom-right for desktop (>= 768px), bottom-center for mobile
      setPosition(window.innerWidth >= 768 ? "bottom-right" : "bottom-center");
    };

    // Set initial position
    handleResize();

    // Listen for window resize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Sonner
      position={position}
      richColors
      offset="calc(var(--review-bar-height, 0px) + 16px)"
      {...props}
    />
  );
};

export { Toaster };
