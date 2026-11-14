import { io, Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";

const socket: Socket = io(API_BASE_URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

let adminRoomRequested = false;

export function joinAdminRoom() {
  adminRoomRequested = true;
  joinAdminRoomAfterConnect();
}

function joinAdminRoomAfterConnect() {
  if (!adminRoomRequested || !socket.connected) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  socket.emit(
    "joinAdminRoom",
    token,
    (response: { success?: boolean; error?: string }) => {
      if (!response?.success) {
        console.error(
          "Failed to join admin notification room:",
          response?.error,
        );
      }
    },
  );
}

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
  joinAdminRoomAfterConnect();
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