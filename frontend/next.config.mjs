// Where the API lives for server-side rewrites. Behind the reverse proxy this is not used
// (the proxy sends /api/* straight to the backend); it keeps `next dev` and `next start`
// same-origin, so the browser never needs CORS.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";

// A single policy for the whole app. Next injects inline bootstrap scripts, so
// 'unsafe-inline' stays for scripts; the value here is that any other origin,
// framing, plugins and base-tag tricks are refused.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://connect.facebook.net https://staticxx.facebook.com",
  "connect-src 'self' https: wss: ws:",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_INTERNAL_URL}/api/:path*` },
      { source: "/socket.io", destination: `${BACKEND_INTERNAL_URL}/socket.io/` },
      { source: "/socket.io/:path*", destination: `${BACKEND_INTERNAL_URL}/socket.io/:path*` },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;
