import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";

const socket: Socket = io(API_BASE_URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error(
    "Socket connection error:",
    error.message
  );
});

export default socket;