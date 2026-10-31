/** @type {import('next').NextConfig} */

// Allow next/image to optimise images served from the project's Supabase Storage bucket.
function supabaseImagePattern() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return [
      {
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

// Non-script security headers. A nonce-based script-src CSP is a recommended
// further hardening step (see README → Security notes).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseImagePattern(),
    formats: ["image/avif", "image/webp"],
    // Set NEXT_IMAGE_UNOPTIMIZED=true when pointing at a local (http://127.0.0.1) Supabase instance.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
