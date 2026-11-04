import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/ui/app-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SITA - MED: Sistem Inventarisasi & Tracking Alat Medis",
  description:
    "SITA - MED: Sistem Inventarisasi & Tracking Alat Medis - Platform pemantauan, operan shift, dan manajemen inventaris alat medis ruang perawatan kritis (HCU/ICU).",
  icons: {
    icon: [
      { url: "/logo.jpeg", href: "/logo.jpeg" },
      { url: "/icon.jpeg", href: "/icon.jpeg" },
    ],
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
