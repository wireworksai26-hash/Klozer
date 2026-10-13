// API location for the browser.
//
// By default the API is reached on the same origin as the site (/api/v1):
//   - production: the reverse proxy (Caddy) sends /api/* to the backend;
//   - development: next.config.mjs rewrites /api/* to http://localhost:5000.
// Same origin means no CORS and no hardcoded host. Set NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SOCKET_URL
// at build time only if the API lives on a different origin.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
export const SERVER_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";
