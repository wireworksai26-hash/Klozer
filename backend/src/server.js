import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import apiRouter from "./routes/api.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { runMigration } from "./database/migrate.js";

const app = express();
const server = http.createServer(app);

// WebSocket Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));

// Raw buffer preservation for Webhook HMAC calculation
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    platform: "Klozer Next-Gen AI Commerce & CRM",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/v1", apiRouter);

// Error Handler
app.use(errorHandler);

// Socket.io Real-Time Connection Handler
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on("join-tenant", (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined room tenant-${tenantId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Server
async function startServer() {
  await runMigration();

  server.listen(config.port, () => {
    console.log(`
============================================================
🚀 KLOZER BACKEND SERVER IS RUNNING
📡 REST API: http://localhost:${config.port}/api/v1
⚡ WebSocket: ws://localhost:${config.port}
🩺 Health Check: http://localhost:${config.port}/health
============================================================
    `);
  });
}

startServer();

export { app, io };
export default server;
