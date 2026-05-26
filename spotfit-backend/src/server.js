const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setupChatSocket } = require('./socket/chatHandler');
const { startScheduler } = require('./jobs/scheduler');
const { connect: redisConnect } = require('./config/redis');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

setupChatSocket(io);

const start = async () => {
  try {
    await redisConnect();
    console.log('Redis connected');

    startScheduler();

    server.listen(PORT, () => {
      console.log(`SpotFit server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

start();
