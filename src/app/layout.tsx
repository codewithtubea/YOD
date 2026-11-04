import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import { PREFERENCES_INIT_SCRIPT } from "@/lib/preferences";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "YOD Circle",
    template: "%s · YOD Circle",
  },
  description:
    "A private circle for daily Scripture, reflection, prayer, and care.",
  applicationName: "YOD Circle",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#10150f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-canvas font-sans text-ink">
        <script
          dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
