// server/index.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Debug logger - TEMPORARY (helps see requests in Railway logs)
app.use((req, res, next) => {
  console.log('REQ', req.method, req.url);
  next();
});

// Serve client static files (assumes client/ is sibling to server/)
const clientDir = path.join(__dirname, '..', 'client');
// serve static files but do NOT auto-serve index.html; let our routes handle "/"
app.use(express.static(clientDir, { index: false }));

// Simple routes to make direct navigation work
app.get('/', (req, res) => res.sendFile(path.join(clientDir, 'auth.html')));
app.get('/lobby', (req, res) => res.sendFile(path.join(clientDir, 'meeting-home.html')));
app.get('/room/:roomId', (req, res) => res.sendFile(path.join(clientDir, 'meeting.html')));

// Health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Minimal mock auth endpoints (for local dev)
// NOTE: replace these with your real auth/DB later
app.post('/api/signup', (req, res) => {
  const { name, email } = req.body;
  const user = { id: email || `u_${Date.now()}`, name: name || 'Guest', email: email || '' };
  // In real app: validate, hash password, store in DB
  res.status(201).json({ user });
});
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  const user = { id: email || `u_${Date.now()}`, name: email?.split('@')[0] || 'Guest', email: email || '' };
  // In real app: validate credentials, issue token/session
  res.json({ user });
});

// SPA fallback - must come AFTER API routes and BEFORE socket handlers / listen
app.get('*', (req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(clientDir, 'auth.html'));
  }
  res.status(404).send('Not Found');
});

// Create HTTP + Socket.IO server
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  // optional config
  cors: { origin: '*' }
});

// In-memory room and client state
// rooms: Map<roomId, Set<socketId>>
// clients: Map<socketId, { roomId, name }>
const rooms = new Map();
const clients = new Map();

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join-room', ({ roomId, name }) => {
    if (!roomId) return;

    // store client meta
    clients.set(socket.id, { roomId, name: name || 'Guest' });

    // add to room set
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    // gather existing users (excluding new socket)
    const existing = Array.from(rooms.get(roomId))
      .filter((id) => id !== socket.id)
      .map((id) => {
        const meta = clients.get(id) || {};
        return { socketId: id, name: meta.name || 'Guest' };
      });

    // Send existing users to the newly joined client
    socket.emit('existing-users', existing);

    // Notify others that a new user joined
    socket.to(roomId).emit('user-joined', { socketId: socket.id, name: name || 'Guest' });

    // Make sure socket actually joins the Socket.IO room (for broadcast convenience)
    socket.join(roomId);

    console.log(`socket ${socket.id} joined room ${roomId} (now ${rooms.get(roomId).size} members)`);
  });

  socket.on('signal', ({ to, data }) => {
    // Forward a signal (offer/answer/ice) to the target peer
    // Add 'from' and optionally name for convenience
    const fromMeta = clients.get(socket.id) || {};
    const payload = {
      from: socket.id,
      name: fromMeta.name || 'Guest',
      data
    };

    if (to) {
      io.to(to).emit('signal', payload);
    } else {
      // If no 'to' provided, broadcast to same room (fallback)
      const client = clients.get(socket.id);
      if (client && client.roomId) {
        socket.to(client.roomId).emit('signal', payload);
      }
    }
  });

  socket.on('disconnect', () => {
    const meta = clients.get(socket.id);
    if (meta && meta.roomId) {
      const { roomId } = meta;
      // remove from rooms map
      const set = rooms.get(roomId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) rooms.delete(roomId);
      }
      // notify remaining participants
      socket.to(roomId).emit('user-left', { socketId: socket.id });
    }
    clients.delete(socket.id);
    console.log('socket disconnected', socket.id);
  });

  // optional: useful debug endpoint per-socket
  socket.on('whoami', () => {
    socket.emit('whoami', { id: socket.id, rooms: Array.from(socket.rooms) });
  });
});

const PORT = process.env.PORT || 3000;

// Bind to 0.0.0.0 so Railway (and other hosts) can reach the server externally.
// Process.env.PORT is provided by Railway.
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (serving client from ${clientDir})`);
});
