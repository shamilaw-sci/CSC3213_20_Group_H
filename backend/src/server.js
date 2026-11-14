import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";

import passport from "./config/passport.js";
import pool, { testConnection } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5050;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: ["http://localhost:3000",
      "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(passport.initialize());

/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.send("Mind-Ease API is running...");
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication
app.use("/api/auth", authRoutes);

// Emergency Support
app.use("/api/emergency", emergencyRoutes);

// Patient-friendly counselling chatbot
app.use("/api/chat", chatRoutes);

// Admin
app.use("/api/admin", adminRoutes);

// Counsellors & Booking
app.use("/api/counsellors", counsellorRoutes);

// Session History
app.use("/api/sessions", sessionRoutes);

// Availability
app.use("/api/availability", availabilityRoutes);

/*
|--------------------------------------------------------------------------
| Logs API
|--------------------------------------------------------------------------
*/

app.post("/api/logs", (req, res) => {
  const {
    message,
    severity = "info",
    metadata = {},
  } = req.body || {};

  const normalizedSeverity = String(severity).toLowerCase();

  const allowedSeverities = [
    "info",
    "warn",
    "warning",
    "error",
    "debug",
  ];

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Log message is required",
    });
  }

  if (!allowedSeverities.includes(normalizedSeverity)) {
    return res.status(400).json({
      success: false,
      message: "Invalid severity",
    });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    severity: normalizedSeverity,
    message,
    metadata,
  };

  console.log("[CLIENT LOG]", logEntry);

  return res.status(200).json({
    success: true,
    message: "Log received",
  });
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/*
|--------------------------------------------------------------------------
| HTTP + Socket.IO Server
|--------------------------------------------------------------------------
*/

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Make io globally available for controllers
global.io = io;

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  socket.on("callUser", (data) => {
    socket.to(data.roomId).emit("incomingCall", {
      caller: data.caller,
    });
  });

  socket.on("endCall", (data) => {
    socket.to(data.roomId).emit("callEnded");
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

async function start() {
  try {
    await testConnection();
    console.log("Connected to MySQL.");
  } catch (err) {
    console.error(
      "FATAL: could not connect to MySQL:",
      err.message
    );
    console.error(
      "Is the database container running? Try: docker compose up -d"
    );
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

/*
|--------------------------------------------------------------------------
| Graceful Shutdown
|--------------------------------------------------------------------------
*/

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();