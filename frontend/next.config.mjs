// Where the API lives for server-side rewrites. Behind the reverse proxy this is not used
// (the proxy sends /api/* straight to the backend); it keeps `next dev` and `next start`
// same-origin, so the browser never needs CORS.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";

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
        ],
      },
    ];
  },
};

export default nextConfig;
