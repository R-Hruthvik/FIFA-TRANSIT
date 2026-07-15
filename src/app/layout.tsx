import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { DemoProvider } from "@/components/DemoController";
import { GuidedWalkthrough } from "@/components/GuidedWalkthrough";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fifa-command-center.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "FIFA Command Center — 2026 World Cup Transit Management",
    template: "%s | FIFA Command Center",
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
  authors: [{ name: "FIFA Command Center Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "FIFA Command Center",
    title: "FIFA Command Center — 2026 World Cup Transit Management",
    description:
      "Unified digital control system for the 2026 World Cup operations, fan engagement, stadium logistics, and real-time transit management.",
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "FIFA Command Center — 2026 World Cup Transit Management Dashboard",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FIFA Command Center — 2026 World Cup Transit Management",
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
      <body className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
        <SessionProvider>
          <DemoProvider>
            {children}
            <GuidedWalkthrough />
          </DemoProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
