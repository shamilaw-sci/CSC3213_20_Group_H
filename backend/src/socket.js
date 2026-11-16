import { Server } from "socket.io";
import { ALLOWED_ORIGINS } from "./config.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("offer", (data) => {
      socket.to(data.roomId).emit(
        "offer",
        data.offer
      );
    });

    socket.on("answer", (data) => {
      socket.to(data.roomId).emit(
        "answer",
        data.answer
      );
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.roomId).emit(
        "ice-candidate",
        data.candidate
      );
    });

    socket.on("disconnect", () => {
      console.log(
        "User Disconnected:",
        socket.id
      );
    });
  });

  return io;
};