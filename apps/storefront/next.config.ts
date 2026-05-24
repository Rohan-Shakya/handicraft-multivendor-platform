import type { NextConfig } from "next";

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
const R2_HOSTNAME = R2_PUBLIC ? new URL(R2_PUBLIC).hostname : null;

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/types", "@repo/config"],
  // Produces a self-contained output for Docker
  output: "standalone",

  eslint: { ignoreDuringBuilds: true },

  // Image optimization via next/image.
  // Whitelist Cloudflare R2 (from env) + common remote patterns for assets
  // served by vendors (we can't constrain vendor CDNs, so use HTTPS everywhere).
  images: {
    // In dev the local image optimizer is the bottleneck (sharp + many
    // remote sources triggers 504s). Skip optimization in dev so images
    // load directly from the source CDN.
    unoptimized: process.env.NODE_ENV !== "production",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images at the CDN/edge for a week. Source URLs that
    // change content also change their pathname (e.g. R2 object keys), so a
    // long TTL is safe.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      ...(R2_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: R2_HOSTNAME,
            },
          ]
        : []),
      // Cloudflare R2 default public bucket pattern (pub-xxx.r2.dev)
      { protocol: "https", hostname: "*.r2.dev" },
      // Seed images — sourced from the Blanxer CDN. Safe to remove once you
      // replace seed product imagery with your own R2/S3 URLs.
      { protocol: "https", hostname: "cdn2.blanxer.com" },
      // Generic HTTPS allow-list (tighten in production as needed)
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },

  // Strict headers for security hygiene
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // HSTS only in production — over HTTP in dev, browsers ignore it
          // anyway, but we don't want it accidentally cached against
          // localhost during cross-environment testing.
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      // Aggressive caching for the Next image optimizer — its responses are
      // already keyed by the source URL + transform params.
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Brotli + gzip via Next default; we just turn on optimizeCss.
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
