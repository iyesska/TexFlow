import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

import { env } from "@/config/env";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

import "./globals.css";
import { Providers } from "./providers";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Libertinus is self-hosted: Next ships no fallback metrics for it on Google Fonts.
const serif = localFont({
  src: [
    {
      path: "./fonts/libertinus-serif-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/libertinus-serif-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-libertinus-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: `${site.name} — Markdown to LaTeX Studio`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
};

// Browser chrome cannot read CSS variables: these mirror --background in tokens.css.
export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1114" },
    { media: "(prefers-color-scheme: light)", color: "#f0efec" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn(sans.variable, mono.variable, serif.variable)}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
