import { Server } from "socket.io";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { loadUserFromToken, verifyToken } from "./middlewares/authMiddleware.js";
import { userConnected, userDisconnected } from "./services/routing/presenceService.js";
import { SESSION_COOKIE, isAllowedOrigin, readCookie } from "./utils/session.js";

let ioInstance = null;

// A revoked session must stop receiving customer conversations promptly even if no
// revocation hook fired (e.g. a change made directly in the database).
const revalidateMs = () => Number(process.env.SOCKET_REVALIDATE_MS) || 60_000;

const userRoom = (id) => `user-${id}`;
const tenantRoom = (id) => `tenant-${id}`;

/** Create the Socket.io server on `httpServer`: authenticated, origin-checked, tenant-isolated. */
export function attachRealtime(httpServer) {
  const REVALIDATE_MS = revalidateMs();
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true, methods: ["GET", "POST"] },
    // CORS does not apply to WebSocket upgrades, so check the Origin ourselves: a page on
    // another site must not be able to open a socket with the victim's cookie.
    allowRequest: (req, cb) => cb(null, isAllowedOrigin(req.headers.origin)),
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      if (!token) return next(new Error("unauthorized"));
      socket.data.user = await loadUserFromToken(token);
      socket.data.token = token;
      socket.data.exp = verifyToken(token).exp;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { user, token, exp } = socket.data;
    socket.join(userRoom(user.id));
    // A user only ever joins their own tenant's room; only the superadmin may watch another.
    socket.join(tenantRoom(user.institution_id));
    // Superadmins are not part of a tenant's team, so they never count as an online agent.
    const tracksPresence = user.role !== "superadmin" && Boolean(user.institution_id);
    if (tracksPresence) userConnected(user).catch((err) => logger.warn({ err: err.message }, "Presence connect failed"));

    socket.on("join-tenant", (tenantId) => {
      const id = Number(tenantId);
      if (user.role === "superadmin" && Number.isInteger(id) && id > 0) socket.join(tenantRoom(id));
    });

    const expiresIn = exp * 1000 - Date.now();
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, expiresIn));

    const revalidate = setInterval(async () => {
      try {
        await loadUserFromToken(token);
      } catch (err) {
        if (err?.statusCode === 401) socket.disconnect(true);
        else logger.warn({ err: err?.message }, "Socket revalidation skipped");
      }
    }, REVALIDATE_MS);

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      clearInterval(revalidate);
      if (tracksPresence) userDisconnected(user);
    });
  });

  ioInstance = io;
  return io;
}

/** Push an event to every connected dashboard of one tenant. No-op before the socket server exists (e.g. in tests). */
export function emitToTenant(tenantId, event, payload) {
  if (ioInstance) ioInstance.to(tenantRoom(tenantId)).emit(event, payload);
}

/** Push an event to one user's open dashboards. */
export function emitToUser(userId, event, payload) {
  if (ioInstance) ioInstance.to(userRoom(userId)).emit(event, payload);
}

/** Immediately drop the live sockets of a user whose sessions were just revoked. */
export function disconnectUser(userId) {
  if (ioInstance) ioInstance.in(userRoom(userId)).disconnectSockets(true);
}

/** Immediately drop every socket that belongs to a tenant (deactivation). */
export function disconnectTenant(tenantId) {
  if (!ioInstance) return;
  // Superadmins watching the tenant are not tenant members; only drop the members' own sockets.
  ioInstance
    .in(tenantRoom(tenantId))
    .fetchSockets()
    .then((sockets) => {
      for (const s of sockets) if (s.data.user?.institution_id === Number(tenantId)) s.disconnect(true);
    })
    .catch((err) => logger.warn({ err: err.message }, "disconnectTenant failed"));
}

/** For tests: stand in for the socket server so what the backend announces can be inspected. */
export function setRealtimeForTests(fake) {
  ioInstance = fake;
}

/** For tests: forget the server so emit/disconnect become no-ops again. */
export function resetRealtime() {
  ioInstance = null;
}
