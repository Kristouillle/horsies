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

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Serve static files from the 'public' directory
app.use('/public', express.static('public'));
app.use('/', express.static('public')); // Add this line to serve files from root path
app.use('/public/scripts', express.static('src/scripts'));

io.on('connection', (socket) => {
  console.log('a user connected');
  
  // Send initial lobby status to new connections
  socket.emit('lobby status', isLobbyActive);

  socket.on('create lobby', () => {
    isLobbyActive = true;
    io.emit('lobby status', isLobbyActive);
  });

  socket.on('close lobby', () => {
    isLobbyActive = false;
    io.emit('lobby status', isLobbyActive);
  });
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('join lobby', () => {
    console.log('Player joined lobby');
    socket.join('lobby');
    socket.emit('lobby joined');
  });

  socket.on('leave lobby', () => {
    console.log('Player left lobby');
    socket.leave('lobby');
  });

  socket.on('player ready', () => {
    console.log('Player ready');
    socket.to('lobby').emit('player ready update');
  });

  socket.on('start game', () => {
    console.log('Game starting');
    io.to('lobby').emit('game start');
  });

  socket.on('button pressed', (buttonText) => {
    console.log('Button pressed:', buttonText);
    io.emit('display text', buttonText);
  });

  socket.on('horse names', (data) => {
    console.log('Horse data received:', data);
    io.emit('show horse options', data);
  });

  socket.on('race setup', (horses) => {
    console.log('Race horses set:', horses);
    currentRaceHorses = horses;
  });

  socket.on('request horse names', () => {
    console.log('Sending horse names:', currentRaceHorses);
    socket.emit('horse names', currentRaceHorses);
  });

  socket.on('horse selected', (data) => {
    console.log('Horse selected:', data);
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

});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});