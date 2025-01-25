const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://3zt1l3c8-5173.euw.devtunnels.ms",
    ], // Add your forwarded port URL here
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://3zt1l3c8-5173.euw.devtunnels.ms",
    ], // Add your forwarded port URL here
  })
);

const rooms = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("createRoom", (callback) => {
    const roomCode = Math.random().toString(36).substring(2, 7);
    rooms[roomCode] = { players: [] };
    console.log("Room created with code:", roomCode);
    callback(roomCode);
  });

  socket.on("joinRoom", (roomCode, callback) => {
    console.log("Attempt to join room with code:", roomCode);
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(socket.id);
      socket.join(roomCode);
      console.log("Client joined room:", roomCode);
      callback(true);
    } else {
      console.log("Room not found:", roomCode);
      callback(false);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    for (const roomCode in rooms) {
      rooms[roomCode].players = rooms[roomCode].players.filter(
        (id) => id !== socket.id
      );
      if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
        console.log("Room deleted:", roomCode);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
