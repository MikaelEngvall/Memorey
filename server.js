const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Create WebSocket server with proper configuration
const wss = new WebSocket.Server({
  server,
  path: "/ws", // Add specific path for WebSocket connections
});

// Enhanced CORS configuration
const allowedOrigins = [
  "http://localhost:5175",
  "https://3zt1l3c8-5175.euw.devtunnels.ms",
  // Remove trailing slash to handle both variants
];

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

// Add basic route for testing
app.get("/health", (req, res) => {
  res.send("Server is running");
});

const rooms = {};

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: "connected", players: [] }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "createRoom":
        const roomCode = Math.random().toString(36).substring(2, 7);
        rooms[roomCode] = {
          players: [],
          hostWs: ws,
        };
        ws.roomCode = roomCode;
        ws.isHost = true;
        console.log("Room created with code:", roomCode);
        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomCode: roomCode,
            players: [],
          })
        );
        break;

      case "joinRoom":
        const joinRoomCode = data.roomCode;
        const playerName =
          data.playerName ||
          `Player ${rooms[joinRoomCode]?.players.length + 1}`;

        if (rooms[joinRoomCode]) {
          rooms[joinRoomCode].players.push({
            ws,
            name: playerName,
          });
          ws.roomCode = joinRoomCode;

          // Broadcast to all players in the room
          const playersList = rooms[joinRoomCode].players.map((p) => p.name);
          rooms[joinRoomCode].players.forEach(({ ws: playerWs }) => {
            playerWs.send(
              JSON.stringify({
                type: "roomUpdate",
                roomCode: joinRoomCode,
                players: playersList,
              })
            );
          });

          ws.send(
            JSON.stringify({
              type: "roomJoined",
              success: true,
              roomCode: joinRoomCode,
              players: playersList,
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "roomJoined",
              success: false,
            })
          );
        }
        break;

      case "startGame":
        const startRoomCode = data.roomCode;
        if (rooms[startRoomCode]) {
          // Store game data in room
          rooms[startRoomCode].gameData = data.gameData;
          rooms[startRoomCode].emojisData = data.emojisData; // Add this

          // Broadcast game start to all players in the room
          rooms[startRoomCode].players.forEach(({ ws: playerWs }) => {
            playerWs.send(
              JSON.stringify({
                type: "gameStarted",
                gameData: data.gameData,
                emojisData: data.emojisData, // Add this
              })
            );
          });
        }
        break;

      case "cardSelected":
        const roomCode = data.roomCode;
        if (rooms[roomCode]) {
          // Broadcast card selection to all players in room
          rooms[roomCode].players.forEach(({ ws: playerWs }) => {
            if (playerWs !== ws) {
              playerWs.send(
                JSON.stringify({
                  type: "cardSelected",
                  selectedCards: data.selectedCards,
                  matchedCards: data.matchedCards,
                  currentPlayer: data.currentPlayer,
                  playerScores: data.playerScores,
                })
              );
            }
          });
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (ws.roomCode && rooms[ws.roomCode]) {
      rooms[ws.roomCode].players = rooms[ws.roomCode].players.filter(
        (player) => player.ws !== ws
      );
      if (rooms[ws.roomCode].players.length === 0) {
        delete rooms[ws.roomCode];
        console.log("Room deleted:", ws.roomCode);
      }
    }
  });
});

// Add error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
  console.log("WebSocket server is running on ws://localhost:3000/ws");
});
