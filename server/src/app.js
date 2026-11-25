require('dotenv').config();
const { validateEnv } = require('./config/env');

validateEnv();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server: SocketIOServer } = require('socket.io');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const adminRouter = require('./routes/admin');
const alertsRouter = require('./routes/alerts');
const authRouter = require('./routes/auth');
const deviceRequestsRouter = require('./routes/deviceRequests');
const managerRouter = require('./routes/manager');
const metaRouter = require('./routes/meta');
const profileRouter = require('./routes/profile');
const readingsRouter = require('./routes/readings');
const messagesRouter = require('./routes/messages');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitizeInput');
const watchReadingChanges = require('./sockets/changeStream');

const socketAuth = require('./sockets/socketAuth');
const { revalidateSocket } = socketAuth;

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

io.use(socketAuth);

io.on('connection', (socket) => {
  if (socket.data && socket.data.userId) {
    socket.join(`user:${socket.data.userId}`);
  }
  if (socket.data && Array.isArray(socket.data.deviceIds)) {
    for (const deviceId of socket.data.deviceIds) {
      socket.join(`device:${deviceId}`);
    }
  }
});

// Security headers
app.use(helmet());

// CORS setup
app.use(cors({
  origin: CLIENT_ORIGIN,
  exposedHeaders: ['X-Export-Truncated', 'X-Export-Row-Cap', 'Content-Disposition']
}));

// Body parser with explicit size limit
app.use(express.json({ limit: '100kb' }));

// Strip Mongo operator-injection keys from request body
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    return res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
  return res.status(200).json({ status: 'ok', db: 'connected' });
});

// Mount routes
app.use('/api/admin', adminRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/auth', authRouter);
app.use('/api/device-requests', deviceRequestsRouter);
app.use('/api/manager', managerRouter);
app.use('/api/meta', metaRouter);
app.use('/api/profile', profileRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/messages', messagesRouter);

// Centralized error handler
app.use(errorHandler);

let revalidateTimer = null;
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down server', { signal });

  try {
    if (revalidateTimer) {
      clearInterval(revalidateTimer);
      revalidateTimer = null;
    }

    if (typeof watchReadingChanges.closeAll === 'function') {
      await watchReadingChanges.closeAll();
    }

    await new Promise((resolve) => io.close(() => resolve()));

    if (server.listening) {
      await new Promise((resolve) => server.close(() => resolve()));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown error', { error: error.message });
    process.exit(1);
  }
}

connectDB()
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      watchReadingChanges(io);

      const revalidateMs = Number.parseInt(process.env.SOCKET_REVALIDATE_INTERVAL_MS || '', 10);
      const intervalMs = Number.isInteger(revalidateMs) && revalidateMs > 0 ? revalidateMs : 60000;
      revalidateTimer = setInterval(() => {
        for (const socket of io.sockets.sockets.values()) {
          revalidateSocket(socket);
        }
      }, intervalMs);
      revalidateTimer.unref();

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));

      server.listen(PORT, () => {
        logger.info('Server listening', { port: PORT });
      });
    }
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error.message });
    process.exit(1);
  });

app.shutdown = shutdown;
module.exports = app;
