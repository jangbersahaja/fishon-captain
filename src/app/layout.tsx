import AuthSessionProvider from "@/components/AuthSessionProvider";
import { DevPanelProvider } from "@/components/DevPanelProvider";
import Navbar from "@/components/Navbar";
import { NotificationProvider } from "@/components/notifications";
import OfflineBanner from "@/components/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";
import { enableCharterFormConsoleLogging } from "@features/charter-onboarding/analytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ec2227",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Fishon Captain — Manage Your Fishing Charters",
    template: "%s | Fishon Captain",
  },
  description:
    "Manage your fishing charter business across Malaysia. Handle bookings, update availability, track revenue, and grow your fishing charter operations with Fishon Captain.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://captain.fishon.my"
  ),
  keywords: [
    "fishing charter management",
    "charter captain dashboard",
    "fishing business Malaysia",
    "charter bookings",
    "fishing boat management",
  ],
  authors: [{ name: "Fishon Team" }],
  creator: "Fishon",
  publisher: "Fishon",
  applicationName: "Fishon Captain",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fishon Captain",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Fishon Captain",
    title: "Fishon Captain — Manage Your Fishing Charters",
    description:
      "Professional charter management platform for Malaysian fishing captains. Manage bookings, availability, and grow your business.",
    url: "https://captain.fishon.my",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Fishon Captain Dashboard",
      },
    ],
    locale: "en_MY",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fishon Captain — Manage Your Fishing Charters",
    description:
      "Professional charter management platform for Malaysian fishing captains.",
    images: ["/og-image.jpg"],
    creator: "@fishonmy",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  category: "business",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV === "development") {
    // Initialize once (safe because component is a Server Component; guard keeps static evaluation harmless)
    enableCharterFormConsoleLogging();
  }

  return (
    <html lang="ms">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col font-sans">
        <DevPanelProvider>
          <AuthSessionProvider>
            <NotificationProvider>
              <Toaster />
              <Navbar />
              <OfflineBanner />
              <main className="flex-1">{children}</main>
              <SpeedInsights />
              <Analytics />
            </NotificationProvider>
          </AuthSessionProvider>
        </DevPanelProvider>
      </body>
    </html>
  );
}

// OfflineBanner now a separate client component
