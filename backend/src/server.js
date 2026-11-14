import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import pool, { testConnection } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

// Make io globally available for controllers (like emergency triggers)
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

async function start() {
  try {
    await testConnection();
    console.log("Connected to MySQL.");
  } catch (err) {
    console.error("FATAL: could not connect to MySQL:", err.message);
    console.error("Is the database container running? Try: docker compose up -d");
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

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