import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Newsreader } from "next/font/google";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s — ${site.name}` },
  description: site.tagline,
  applicationName: site.name,
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} RSS feed` }] } },
  openGraph: { type: "website", siteName: site.name, title: site.name, description: site.tagline, url: site.url, locale: "en_GB" },
  twitter: { card: "summary_large_image", title: site.name, description: site.tagline },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${serif.variable}`}>
      <body>
        <a href="#main" className="sr-only z-[200] rounded-full bg-accent px-4 py-2 text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
