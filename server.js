const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:5175",
  "https://3zt1l3c8-5175.euw.devtunnels.ms",
  // Remove trailing slash to handle both variants
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Access-Control-Allow-Origin", "Content-Type"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // Add explicit transports
  pingTimeout: 60000, // Increase timeout for tunneled connections
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked CORS for:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

io.use((socket, next) => {
  socket.request.headers.origin = socket.request.headers.origin || "*";
  next();
});

const rooms = {};

io.on("connect_error", (err) => {
  console.log("Connection error:", err);
});

io.on("connection", (socket) => {
  console.log(
    `Client connected: ${socket.id} from ${socket.handshake.headers.origin}`
  );

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
      socket.emit("roomJoined", roomCode);
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

  socket.on("error", (error) => {
    console.log("Socket error:", error);
  });
});

// Add error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});
