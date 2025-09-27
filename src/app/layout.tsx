import AuthSessionProvider from "@/components/AuthSessionProvider";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/toast/ToastContext";
import { useOnlineStatusBanner } from "@/hooks/useOnlineStatusBanner";
import { enableCharterFormConsoleLogging } from "@features/charter-onboarding/analytics";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fishon — Malaysia’s Fishing & Charter Booking (Coming Soon)",
  description:
    "Fishon is Malaysia’s first fishing & charter booking platform. We’re reeling in something exciting — launching soon!",
  metadataBase: new URL("https://your-domain-here.com"),
  robots: { index: false, follow: false }, // keep out of search until launch
  openGraph: {
    title: "Fishon — Coming Soon",
    description:
      "Malaysia’s first fishing & charter booking platform. Launching soon.",
    url: "https://fishon.my",
    siteName: "Fishon",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV === "development") {
    // Initialize once (safe because component is a Server Component; guard keeps static evaluation harmless)
    enableCharterFormConsoleLogging();
  }
  return (
    <html lang="en">
      <body className={`${inter.className} h-full`}>
        <AuthSessionProvider>
          <ToastProvider>
            <Navbar />
            <OfflineBanner />
            {children}
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

// Client-only inline component for offline status
function OfflineBanner() {
  const { online } = useOnlineStatusBanner();
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center bg-amber-600 px-4 py-2 text-center text-xs font-medium text-white shadow-md">
      <span className="truncate">You are offline. Changes will retry when connection is restored.</span>
    </div>
  );
}
