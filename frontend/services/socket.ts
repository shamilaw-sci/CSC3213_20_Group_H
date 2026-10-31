import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

const socket = io(API_BASE_URL, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

export default socket;