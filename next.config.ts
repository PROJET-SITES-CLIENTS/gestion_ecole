import type { NextConfig } from "next";

// F15 — en-têtes de sécurité appliqués à toutes les réponses.
// CSP pragmatique : pas de sources externes autorisées pour les scripts
// (l'app n'en charge aucune), styles inline autorisés (Tailwind/Radix).
const headersSecurite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false, // F15 — ne pas révéler la stack
  async headers() {
    return [{ source: "/:path*", headers: headersSecurite }];
  },
};

export default nextConfig;
