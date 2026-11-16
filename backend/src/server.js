import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import pool, { testConnection } from "./config/db.js";
import { runMigrations } from "./db/migrate.js";
import jwt from "jsonwebtoken";
import { SECRET } from "./config.js";
import { escalateUnacknowledgedAlerts } from "./services/escalationService.js";

const PORT = process.env.PORT || 5050;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Make io available globally
global.io = io;

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  /*
   * Join voice counselling room
   */
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(
      `${socket.id} joined room ${roomId}`
    );
  });

  /*
   * Existing room support
   */
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  socket.on("joinAdminRoom", (token) => {
    try {
      const user = jwt.verify(token, SECRET);
      if (["admin", "supervisor"].includes(String(user.role).toLowerCase())) {
        socket.join("admin-room");
      }
    } catch (error) {
      console.error("Admin socket authentication failed:", error.message);
    }
  });

  socket.on("joinUserRoom", (token) => {
    try {
      const user = jwt.verify(token, SECRET);
      if (user?.id) {
        socket.join(`user-${user.id}`);
      }
      if (String(user.role).toLowerCase() === "counsellor") {
        socket.join("counsellors-room");
      }
      if (["admin", "supervisor"].includes(String(user.role).toLowerCase())) {
        socket.join("admin-room");
      }
    } catch (error) {
      console.error("User socket authentication failed:", error.message);
    }
  });

  /*
   * Existing call support
   */
  socket.on("callUser", (data) => {
    socket.to(data.roomId).emit(
      "incomingCall",
      {
        caller: data.caller,
      }
    );
  });

  socket.on("endCall", (data) => {
    socket.to(data.roomId).emit(
      "callEnded"
    );
  });

  /*
   * WebRTC Offer
   */
  socket.on("offer", (data) => {
    socket.to(data.roomId).emit(
      "offer",
      data.offer
    );
  });

  /*
   * WebRTC Answer
   */
  socket.on("answer", (data) => {
    socket.to(data.roomId).emit(
      "answer",
      data.answer
    );
  });

  /*
   * WebRTC ICE Candidates
   */
  socket.on(
    "ice-candidate",
    (data) => {
      socket
        .to(data.roomId)
        .emit(
          "ice-candidate",
          data.candidate
        );
    }
  );

  socket.on("disconnect", () => {
    console.log(
      "User Disconnected:",
      socket.id
    );
  });
});

async function start() {
  try {
    await testConnection();

    console.log(
      "Connected to MySQL successfully."
    );

    await runMigrations();
    console.log("Database schema verified.");
  } catch (err) {
    console.error(
      "FATAL: could not connect to MySQL:",
      err.message
    );

    console.error(
      "Check your DB settings or run docker compose up -d"
    );

    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });

  // Periodic escalation check for unacknowledged high-risk alerts
  const escalationInterval = setInterval(() => {
    escalateUnacknowledgedAlerts().catch((err) =>
      console.error("Escalation sweep failed:", err.message)
    );
  }, 60 * 1000);
  escalationInterval.unref?.();
}

async function shutdown(signal) {
  console.log(
    `${signal} received, shutting down...`
  );

  server.close(async () => {
    try {
      await pool.end();

      console.log(
        "MySQL connection closed."
      );
    } catch (error) {
      console.error(error);
    }

    process.exit(0);
  });
}

process.on("SIGINT", () =>
  shutdown("SIGINT")
);

process.on("SIGTERM", () =>
  shutdown("SIGTERM")
);

start();