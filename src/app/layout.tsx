import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScolaGestion V4 — Plateforme SaaS de Gestion Scolaire",
  description: "Plateforme SaaS complète de gestion scolaire : élèves, personnel, pédagogie, finances, communication, multi-tenant.",
  keywords: ["ScolaGestion", "gestion scolaire", "SaaS", "école", "éducation", "Next.js"],
  authors: [{ name: "ScolaGestion" }],
  // D4 — PWA : manifeste d'installation (icône SVG : public/logo.svg)
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ScolaGestion V4",
    description: "Plateforme SaaS de gestion scolaire complète",
    siteName: "ScolaGestion",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
