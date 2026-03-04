import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter_Tight, DM_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  weight: ["200", "900"],
  subsets: ["latin"],
  variable: "--font-logo",
});

const dmSans = DM_Sans({
  weight: ["200"],
  subsets: ["latin"],
  variable: "--font-logo-sub",
});

export const metadata: Metadata = {
  title: "Perpl Music | Web Player",
  description: "作業用BGM自動生成プレイヤー",
  keywords: ["Perpl", "Perpl Music", "BGM", "作業用BGM", "プレイリスト", "lo-fi", "音楽プレイヤー"],
  openGraph: {
    title: "Perpl Music",
    description: "Web Player",
    siteName: "Perpl Music",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perpl Music",
    description: "Web Player",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} ${dmSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
