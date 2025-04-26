import parseCookie from 'cookie';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { v4 } from 'uuid';
import User from './public/models/User.js';
import Lobby from './public/models/Lobby.js';
// import { simulate } from './public/scripts/simulation.js';
// simulate();

const uuidv4 = v4;
const app = express();
const server = createServer(app);
const io = new Server(server);
const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSessionToken = uuidv4();
let lobby = new Lobby();
lobby = new Lobby();
lobby.horses = [
  {
    name: 'Chillhooves',
    spritePath: '/horses/generic/warmbloods.png',
    effects: {}
  },
  {
    name: 'Sad horse',
    spritePath: '/horses/specials/bojackhorse.png',
    effects: {}
  },
  {
    name: 'Summer Shine',
    spritePath: '/horses/generic/americanquarter.png',
    effects: {}
  },
  { name: 'Neighvana', spritePath: '/horses/generic/emohorse.png', effects: {} }
];
lobby.host = new User(100);
lobby = undefined;
const users = {};
let restrictedMode = true; // Add this line
// Keep user "connection" alive through cookie
app.use(cookieParser());
app.use(express.json());
// we will assume we wont be capping out
// use 1 to simplify truthy checks
let session_id_counter = 1;
app.use((req, res, next) => {
  if (!req.cookies.user_id || req.cookies.session_token !== serverSessionToken) {
    const newId = session_id_counter++; // uuidv4();
    var cookieSettings = {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: 'strict', // Or 'strict', depending on your setup
      secure: false // Set to true if using HTTPS
    };
    res.cookie('user_id', newId, cookieSettings);
    res.cookie('session_token', serverSessionToken, cookieSettings);
    req.user_id = newId;
    req.session_token = serverSessionToken;
    users[newId] = new User(newId);
  } else {
    req.user_id = req.cookies.user_id;
    req.session_token = req.cookies.session_token;
  }
  next();
});
io.use((socket, next) => {
  const rawCookies = socket.handshake.headers.cookie;
  if (rawCookies) {
    const cookies = parseCookie.parse(rawCookies);
    socket.user_id = cookies.user_id || -1; // fallback
    // socket.session_token = cookies.session_token || -1; // fallback
  } else {
    socket.user_id = -1; // fallback
    // socket.session_token = -1; // fallback
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
  let myUser = TryGetMyUser(socket.user_id);
  console.log('New socket connected with token:', myUser.id, myUser.name);

  socket.join(myUser.id);
  // Send initial lobby status to new connections
  socket.emit('lobby status', lobby != undefined);
  socket.to('lobby').emit('race status', myUser, lobby);
  socket.on('create lobby', () => {
    console.log(`create lobby - isLobbyActive:${lobby} - user_id:${myUser.id}`);
    if (!lobby && myUser.IsValid()) {
      lobby = new Lobby(myUser);
      console.log(lobby);
      socket.join('host');
      socket.emit('feedback', `Lobby created`);
    }
    io.emit('lobby status', lobby != undefined);
  });
  socket.on('close lobby', () => {
    console.log(`close lobby - isLobbyActive:${lobby} - user_id:${socket.user_id}`);
    if (lobby && lobby.IsTheHost(myUser)) {
      lobby = undefined;
      socket.leave('host');
      socket.emit('feedback', 'Lobby closed');
    }
    socket.emit('lobby status', lobby != undefined);
  });

  socket.on('disconnect', () => {
    // console.log(`user disconnected - user_id:${socket.user_id}`);
  });
  socket.on('join lobby', () => {
    console.log(`Player joining lobby - user_id:${myUser.id}`);
    console.log(lobby);
    if (lobby) {
      if (lobby.ParticiapantTriesToJoin(myUser)) {
        socket.join('lobby');
        io.emit('feedback', `Lobby joined ${myUser.id}`);
        return;
      }
      io.emit('feedback', `Already in lobby ${myUser.id}`);
    }
  });
  socket.on('leave lobby', () => {
    console.log(`leave lobby - user_id:${socket.user_id}`);
    socket.leave('lobby');
    if (lobby) {
      delete lobby.participants[myUser.id];
    }
  });
  socket.on('button pressed', (buttonText) => {
    console.log(`Button pressed - user_id:${socket.user_id}`);
    // io.emit('display text', buttonText);
  });
  socket.on('race setup', (data) => {
    console.log('Race setup received:', data);
    lobby.horses = data.horses;
    lobby.isRestrictedMode = data.restrictedMode;
    console.log('Restricted mode set to:', restrictedMode);
  });
  socket.on('race start', () => {
    console.log('Race starting from server');
    if (lobby) {
      if (lobby.StartRace(myUser)) {
        console.log('emit race start allowed');
        // Broadcast race start to all connected clients
        io.emit('race start allowed', { horses: lobby.horses });
      }
    }
  });
  socket.on('race end', () => {
    console.log('Race ended');
    lobby.EndRace(myUser);
    io.emit('race end');
  });
  socket.on('add coins', (amount) => {
    myUser.coins += amount;
    io.to('lobby').emit('race status', myUser, lobby);
  });
  socket.on('action selected', (args) => {
    if (lobby && args.horse && args.action) {
      if (lobby.ParticiapantTriesToUseAction(myUser, args.horse, args.action)) {
        io.emit('race update', { horses: lobby.horses });
      } else {
        socket.emit('show banner', 'You cannot do that, peasant.');
      }
    }
  });
  socket.on('broadcast race update', () => {
    console.log('Broadcasting race update to all clients:');
    // Broadcast to all connected clients including sender
    socket.to('lobby').emit('race status', myUser, lobby);
  });

  socket.on('request lobby redirect', () => {
    if (lobby) {
      console.log(lobby.participants);
      if (lobby.IsTheHost(myUser)) {
        socket.emit('redirect to lobby', '/public/game.html');
      } else if (lobby.IsAParticipant(myUser)) {
        socket.emit('redirect to lobby', '/public/joinlobby.html');
      }
    }
  });

  socket.on('request race status', () => {
    console.log(`Request race status`);
    if (lobby) {
      if (lobby.IsTheHost(myUser) || lobby.IsAParticipant(myUser)) {
        socket.emit('race status', myUser, lobby);
      }
    }
  });
});
server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
function TryGetMyUser(user_id) {
  let user = users[user_id];
  if (user)
    return user
  return new User(-1);
}