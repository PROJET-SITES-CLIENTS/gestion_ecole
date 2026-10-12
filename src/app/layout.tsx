import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563EB',
};

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
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        {/* FX — toasts Sonner : confirmations qui tombent avec un ressort */}
        <SonnerToaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              border: '2px solid #0A0A0A',
              borderRadius: 0,
              boxShadow: '4px 4px 0px #0A0A0A',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
