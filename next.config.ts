import type { NextConfig } from "next";

// F15 — en-têtes de sécurité appliqués à toutes les réponses.
const headersSecurite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
];

// Vercel détecte automatiquement Next.js : PAS de standalone (il a son
// propre runtime). Standalone = auto-hébergement (VPS, Docker, systemd).
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  // Conditional : standalone UNIQUEMENT hors Vercel
  ...(isVercel ? {} : { output: "standalone" as const }),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: headersSecurite }];
  },
};

export default nextConfig;
