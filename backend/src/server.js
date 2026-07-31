const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});