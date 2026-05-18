import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
