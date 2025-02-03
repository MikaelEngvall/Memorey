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
  let roomCode = null; // Track room code for this connection
  ws.isJoined = false; // Add flag to track if client has joined a room

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: "connected", players: [] }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("Server received:", data);
    const room = rooms[data.roomCode];

    switch (data.type) {
      case "createRoom": {
        if (ws.isJoined) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Already in a room",
            })
          );
          break;
        }
        roomCode = Math.random().toString(36).substring(2, 7);
        const playerName = data.playerName || "Host";
        rooms[roomCode] = {
          players: [
            {
              ws,
              name: playerName,
              isAdmin: true,
            },
          ],
          hostWs: ws,
          isActive: true, // Add flag to track active rooms
        };
        ws.roomCode = roomCode;
        ws.isHost = true;
        ws.isJoined = true;
        console.log("Room created with code:", roomCode);
        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomCode: roomCode,
            players: [playerName],
            isAdmin: true,
          })
        );
        break;
      }

      case "joinRoom": {
        if (ws.isJoined) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Already in a room",
            })
          );
          break;
        }

        const joinRoomCode = data.roomCode;
        const playerName =
          data.playerName ||
          `Player ${rooms[joinRoomCode]?.players.length + 1}`;

        if (rooms[joinRoomCode]) {
          // Check if player name already exists in room
          const playerExists = rooms[joinRoomCode].players.some(
            (p) => p.name === data.playerName
          );

          if (playerExists) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Player name already exists in room",
              })
            );
            break;
          }

          const isAdmin = false;
          rooms[joinRoomCode].players.push({
            ws,
            name: playerName,
            isAdmin,
          });

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
          ws.isJoined = true;
        } else {
          ws.send(
            JSON.stringify({
              type: "roomJoined",
              success: false,
            })
          );
        }
        break;
      }

      case "startGame": {
        if (room && room.isActive) {
          // Store complete game state
          room.gameState = {
            gameData: data.gameData,
            emojisData: data.emojisData,
            currentPlayer: 0,
            playerScores: new Array(room.players.length).fill(0),
            selectedCards: [],
            matchedCards: [],
            isGameStarted: true,
          };

          // Broadcast complete game state to all players
          broadcastToRoom(room, {
            type: "gameStarted",
            ...room.gameState,
          });
        }
        break;
      }

      case "turnCard": {
        if (room && room.gameState) {
          const playerIndex = room.players.findIndex((p) => p.ws === ws);

          if (playerIndex === room.gameState.currentPlayer) {
            // Update game state
            room.gameState.selectedCards = data.selectedCards;

            // Broadcast card flip immediately
            broadcastToRoom(room, {
              type: "cardFlipped",
              selectedCards: room.gameState.selectedCards,
              currentPlayer: room.gameState.currentPlayer,
            });

            if (data.selectedCards.length === 2) {
              const isMatch =
                data.selectedCards[0].name === data.selectedCards[1].name;

              if (isMatch) {
                room.gameState.playerScores[playerIndex]++;
                room.gameState.matchedCards = [
                  ...room.gameState.matchedCards,
                  ...data.selectedCards,
                ];
              }

              setTimeout(() => {
                if (!isMatch) {
                  room.gameState.currentPlayer =
                    (room.gameState.currentPlayer + 1) % room.players.length;
                }
                room.gameState.selectedCards = [];

                // Broadcast updated game state
                broadcastToRoom(room, {
                  type: "turnComplete",
                  currentPlayer: room.gameState.currentPlayer,
                  playerScores: room.gameState.playerScores,
                  matchedCards: room.gameState.matchedCards,
                  matchedPair: isMatch ? data.selectedCards : [],
                });
              }, 1000);
            }
          }
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      room.players = room.players.filter((player) => player.ws !== ws);

      // Only delete room if it's empty and game hasn't started
      if (room.players.length === 0 && !room.gameStarted) {
        delete rooms[roomCode];
        console.log("Room deleted:", roomCode);
      } else {
        // Notify remaining players about disconnection
        room.players.forEach(({ ws: playerWs }) => {
          playerWs.send(
            JSON.stringify({
              type: "playerDisconnected",
              players: room.players.map((p) => p.name),
            })
          );
        });
      }
    }
  });
});

function broadcastToRoom(room, message) {
  room.players.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Add error handler for unhandled promises
process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
  console.log("WebSocket server is running on ws://localhost:3000/ws");
});
