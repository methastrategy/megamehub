/**
 * Lightweight WebSocket Server for Local Testing
 * Run: node server/localDevServer.js
 */
import { WebSocketServer } from 'ws';

const PORT = 1999;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

console.log(`[MeGAMEHUB] PartyKit Local WebSocket Server running on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const roomCode = pathParts[pathParts.length - 1] || 'default';

  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  const roomClients = rooms.get(roomCode);
  roomClients.add(ws);

  console.log(`[Room ${roomCode}] Client connected. Total in room: ${roomClients.size}`);

  ws.on('message', (data) => {
    // Broadcast to other clients in the same room
    for (const client of roomClients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data.toString());
      }
    }
  });

  ws.on('close', () => {
    roomClients.delete(ws);
    console.log(`[Room ${roomCode}] Client disconnected. Remaining: ${roomClients.size}`);
    if (roomClients.size === 0) {
      rooms.delete(roomCode);
    }
  });
});
