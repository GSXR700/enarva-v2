// server.js
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // À ajuster pour la production
    },
  });

  // Gérer les connexions Socket.IO
  io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté au socket:', socket.id);

    // Événement pour rejoindre une "room" (utile pour le chat)
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
    });

    // Événement générique pour diffuser des informations à tous les clients
    socket.on('broadcast', (data) => {
      // 'data' devrait contenir 'event' (ex: 'new_lead') et 'payload' (les données du lead)
      io.emit(data.event, data.payload);
    });

    socket.on('disconnect', () => {
      console.log('Un utilisateur est déconnecté:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Serveur (Next.js + Socket.IO) prêt sur http://localhost:${PORT}`);
  });
});