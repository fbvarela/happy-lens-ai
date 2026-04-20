/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default;

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

module.exports = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: { document: "/offline" },
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      { urlPattern: /^\/api\//, handler: "NetworkOnly" },
      { urlPattern: /^\/(login|setup)/, handler: "NetworkOnly" },
      {
        urlPattern: /\/_next\/static\//,
        handler: "CacheFirst",
        options: { cacheName: "next-static", expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 } },
      },
      { urlPattern: /\/_next\/image/, handler: "StaleWhileRevalidate", options: { cacheName: "next-images" } },
      { urlPattern: /^\/(icons|screenshots)\//, handler: "CacheFirst", options: { cacheName: "static-assets" } },
      { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: "StaleWhileRevalidate", options: { cacheName: "gfonts-css" } },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
        handler: "CacheFirst",
        options: { cacheName: "gfonts-files", expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 } },
      },
      { urlPattern: /^\//, handler: "NetworkFirst", options: { cacheName: "pages", networkTimeoutSeconds: 3 } },
    ],
  },
})(nextConfig);
