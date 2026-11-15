
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
const PORT = process.env.PORT || 6001;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
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

app.use("/api/auth", authRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/counsellors", counsellorRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/availability", availabilityRoutes);

/*
|--------------------------------------------------------------------------
| Client Logs
|--------------------------------------------------------------------------
*/

app.post("/api/logs", (req, res) => {
  const {
    message,
    severity = "info",
    metadata = {},
  } = req.body || {};

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Log message is required",
    });
  }

  console.log("[CLIENT LOG]", {
    timestamp: new Date().toISOString(),
    severity,
    message,
    metadata,
  });

  return res.status(200).json({ success: true });
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
| 404
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
| Error Handler
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
| HTTP + SOCKET.IO SERVER
|--------------------------------------------------------------------------
*/

const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

/*
|--------------------------------------------------------------------------
| Socket.IO Signalling
|--------------------------------------------------------------------------
*/

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Both student and counsellor must join the same room ID.
  socket.on("join-room", (roomId) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      console.log("Invalid room ID from:", socket.id);
      return;
    }

    socket.join(roomId);

    console.log(
      `Socket ${socket.id} joined room ${roomId}`
    );

    console.log(
      `Sockets currently in room ${roomId}:`,
      io.sockets.adapter.rooms.get(roomId)?.size || 0
    );
  });

  // WebRTC offer: send to the other participant in the room.
  socket.on("offer", (data) => {
    if (!data?.roomId || !data?.offer) {
      console.log("Invalid offer received from:", socket.id);
      return;
    }

    console.log(
      `Sending WebRTC offer to room ${data.roomId}`
    );

    socket.to(data.roomId).emit("offer", data.offer);
  });

  // WebRTC answer: send to the other participant in the room.
  socket.on("answer", (data) => {
    if (!data?.roomId || !data?.answer) {
      console.log("Invalid answer received from:", socket.id);
      return;
    }

    console.log(
      `Sending WebRTC answer to room ${data.roomId}`
    );

    socket.to(data.roomId).emit("answer", data.answer);
  });

  // ICE candidates are exchanged between participants.
  socket.on("ice-candidate", (data) => {
    if (!data?.roomId || !data?.candidate) {
      return;
    }

    socket.to(data.roomId).emit(
      "ice-candidate",
      data.candidate
    );
  });

  // End the call for everyone in the room.
  socket.on("endCall", (data) => {
    if (!data?.roomId) {
      return;
    }

    console.log(`Call ended in room ${data.roomId}`);

    io.to(data.roomId).emit("callEnded");
  });

  // Legacy room support.
  socket.on("joinRoom", (roomId) => {
    if (typeof roomId === "string" && roomId.trim()) {
      socket.join(roomId);
    }
  });

  // Legacy emergency notification support.
  socket.on("emergency-call", (data) => {
    io.emit("emergency-call", data);
  });

  // Legacy incoming-call support.
  socket.on("callUser", (data) => {
    if (!data?.roomId) return;

    socket.to(data.roomId).emit("incomingCall", {
      caller: data.caller,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `Socket disconnected: ${socket.id}. Reason: ${reason}`
    );
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

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(
      "FATAL: could not connect to MySQL:",
      err.message
    );

    process.exit(1);
  }
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
