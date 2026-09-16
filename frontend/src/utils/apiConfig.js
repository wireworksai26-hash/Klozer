// Dynamic API & Server Base URL Configuration for Klozer
// Supports Localhost Development, Docker, and Production VPS Deployments

export const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
    ? `${window.location.origin}/api/v1`
    : "http://localhost:5000/api/v1");

export const SERVER_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SOCKET_URL) ||
  (typeof window !== "undefined" && !window.location.hostname.includes("localhost")
    ? window.location.origin
    : "http://localhost:5000");
