import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { DemoProvider } from "@/components/DemoController";

import GoogleOneTap from "@/components/auth/GoogleOneTap";
import { getAllBgImages } from "@/lib/bg-images";
import "./globals.css";

// Initialize environment validation early in development
if (process.env.NODE_ENV === 'development') {
  // Only run validation on server-side to avoid client bundle bloat
  if (typeof window === 'undefined') {
    import('@/lib/env-validator').then(({ runEnvironmentValidation }) => {
      runEnvironmentValidation();
    }).catch((err) => {
      console.error('Failed to load environment validator:', err);
    });
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stadiumflow.vercel.app";

// Use the first image deterministically to avoid SSR hydration mismatch
const bgImage = getAllBgImages()[0];

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "StadiumFlow — 2026 World Cup Transit Management",
    template: "%s | StadiumFlow",
  },
  description:
    "Unified digital control system for the 2026 World Cup operations, fan engagement, stadium logistics, and real-time transit management.",
  keywords: [
    "FIFA World Cup 2026",
    "transit management",
    "stadium operations",
    "fan engagement",
    "live telemetry",
    "AI copilot",
    "sports dashboard",
    "hackathon",
  ],
  authors: [{ name: "StadiumFlow Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "StadiumFlow",
    title: "StadiumFlow — 2026 World Cup Transit Management",
    description:
      "Unified digital control system for the 2026 World Cup operations, fan engagement, stadium logistics, and real-time transit management.",
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "StadiumFlow — 2026 World Cup Transit Management Dashboard",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StadiumFlow — 2026 World Cup Transit Management",
    description:
      "Unified digital control system for the 2026 World Cup operations, fan engagement, stadium logistics, and real-time transit management.",
    images: [`${baseUrl}/api/og`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body
        className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30 relative"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay so content stays readable */}
        <div className="fixed inset-0 bg-zinc-950/80 dark:bg-zinc-950/90 pointer-events-none" />
        <SessionProvider>
          <DemoProvider>
            {children}

            <GoogleOneTap />
          </DemoProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
