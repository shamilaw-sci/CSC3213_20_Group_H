
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

const socket: Socket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// --------------------------------------------------
// Admin room
// --------------------------------------------------
export function joinAdminRoom() {
    const token = localStorage.getItem("token");

    if (token && socket.connected) {
        socket.emit("joinAdminRoom", token);
    } else if (token) {
        socket.once("connect", () => {
            socket.emit("joinAdminRoom", token);
        });
    }
}

// --------------------------------------------------
// Socket connection events
// --------------------------------------------------
socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
});

// --------------------------------------------------
// Emergency and WebRTC event logging
// --------------------------------------------------
socket.on("emergencyAlert", (data) => {
    console.log("🚨 New emergency request:", data);
});

socket.on("emergency-call", (data) => {
    console.log("📞 Emergency call accepted:", data);
});

socket.on("offer", (data) => {
    console.log("📡 WebRTC offer received:", data.roomId);
});

socket.on("answer", (data) => {
    console.log("📡 WebRTC answer received:", data.roomId);
});

socket.on("ice-candidate", (data) => {
    console.log("🧊 ICE candidate received:", data.roomId);
});

socket.on("callEnded", () => {
    console.log("📴 Call ended.");
});

export default socket;
