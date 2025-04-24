import parseCookie from 'cookie';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

let currentRaceHorses = [];
let isLobbyActive = false;  // Add this line
let restrictedMode = true; // Add this line
let userWallets = new Map(); // Add this line to track user wallets

// Keep user "connection" alive through cookie
app.use(cookieParser());
app.use(express.json());

// we will assume we wont be capping out
// use 1 to simplify truthy checks
let session_id_counter = 1;

app.use((req, res, next) => {
  if (!req.cookies.user_id) {
    const newId = session_id_counter++;
    res.cookie('user_id', newId, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    });
    req.user_id = newId;
    userWallets.set(newId.toString(), 10); // Initialize wallet with 10 coins
  } else {
    req.user_id = req.cookies.user_id;
    if (!userWallets.has(req.user_id.toString())) {
      userWallets.set(req.user_id.toString(), 10); // Initialize wallet if not exists
    }
  }
  next();
});

io.use((socket, next) => {
  const rawCookies = socket.handshake.headers.cookie;
  if (rawCookies) {
    const cookies = parseCookie.parse(rawCookies);
    socket.user_id = cookies.user_id || -1; // fallback
  } else {
    socket.user_id = -1; // fallback
  }
  next();
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Serve static files from the 'public' directory
app.use('/public', express.static('public'));
app.use('/', express.static('public')); // Add this line to serve files from root path
app.use('/public/scripts', express.static('src/scripts'));

io.on('connection', (socket) => {
  console.log('New socket connected with token:', socket.user_id);
  
  // Send initial lobby status to new connections
  socket.emit('lobby status', isLobbyActive);

  socket.on('create lobby', () => {
    isLobbyActive = true;
    console.log(`create lobby - isLobbyActive:${isLobbyActive} - user_id:${socket.user_id}`);
    io.emit('lobby status', isLobbyActive);
  });

  socket.on('close lobby', () => {
    isLobbyActive = false;
    console.log(`close lobby - isLobbyActive:${isLobbyActive} - user_id:${socket.user_id}`);
    io.emit('lobby status', isLobbyActive);
  });
  
  socket.on('disconnect', () => {
    console.log(`user disconnected - user_id:${socket.user_id}`);
  });

  socket.on('join lobby', () => {
    console.log(`Player joined lobby - user_id:${socket.user_id}`);
    socket.join('lobby');
    socket.emit('lobby joined');
  });

  socket.on('leave lobby', () => {
    console.log(`Player left lobby - user_id:${socket.user_id}`);
    socket.leave('lobby');
  });

  socket.on('player ready', () => {
    console.log(`Player ready - user_id:${socket.user_id}`);
    socket.to('lobby').emit('player ready update');
  });

  socket.on('start game', () => {
    console.log(`Game starting - user_id:${socket.user_id}`);
    io.to('lobby').emit('game start');
  });

  socket.on('button pressed', (buttonText) => {
    console.log(`Button pressed - user_id:${socket.user_id}`);
    io.emit('display text', buttonText);
  });

  socket.on('horse names', (data) => {
    console.log('Horse names received:', data, `user_id:${socket.user_id}`);
    io.emit('show horse options', data);  // Changed to emit show horse options instead
  });

  socket.on('race setup', (data) => {
    console.log('Race setup received:', data);
    currentRaceHorses = data.horses;
    restrictedMode = data.restrictedMode;
    console.log('Restricted mode set to:', restrictedMode);
  });

  socket.on('request horse names', () => {
    console.log('Sending horse names and settings:', currentRaceHorses, restrictedMode);
    socket.emit('horse names', currentRaceHorses);
    socket.emit('restricted mode', restrictedMode);
  });

  socket.on('horse selected', (data) => {
    console.log('Horse selected:', data, `user_id:${socket.user_id}`);
    io.emit('display text', data.fullMessage);
  });

  socket.on('stim horse', (name) => {
    console.log('Server received stim request for horse:', name);
    io.emit('stim horse', name); // Broadcast to all clients
  });

  socket.on('sabotage horse', (name) => {
    console.log('Server received sabotage request for horse:', name);
    io.emit('sabotage horse', name); // Broadcast to all clients
  });

  socket.on('race start', () => {
    console.log('Race starting from server');
    // Broadcast race start to all connected clients
    io.emit('race start');
  });

  socket.on('race end', () => {
    console.log('Race ended');
    io.emit('race end');
  });

  // Add these new event handlers
  socket.on('request wallet', () => {
    const wallet = userWallets.get(socket.user_id.toString()) || 10;
    socket.emit('wallet update', wallet);
  });

  socket.on('spend coins', (amount) => {
    const currentWallet = userWallets.get(socket.user_id.toString()) || 0;
    if (currentWallet >= amount) {
      userWallets.set(socket.user_id.toString(), currentWallet - amount);
      socket.emit('wallet update', currentWallet - amount);
      return true;
    }
    return false;
  });

  socket.on('add coins', (amount) => {
    const currentWallet = userWallets.get(socket.user_id.toString()) || 0;
    userWallets.set(socket.user_id.toString(), currentWallet + amount);
    socket.emit('wallet update', currentWallet + amount);
  });

});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});