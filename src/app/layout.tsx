import AuthSessionProvider from "@/components/AuthSessionProvider";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OfflineBanner from "@/components/OfflineBanner";
import { ToastProvider } from "@/components/toast/ToastContext";
import { enableCharterFormConsoleLogging } from "@features/charter-onboarding/analytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import "./globals.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col">
        <AuthSessionProvider>
          <ToastProvider>
            <Navbar />
            <OfflineBanner />
            <main className="flex-1">{children}</main>
            <Footer />
            <SpeedInsights />
            <Analytics />
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

// OfflineBanner now a separate client component
