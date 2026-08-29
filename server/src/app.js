require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
const connectDB = require('./config/db');
const readingsRouter = require('./routes/readings');
const errorHandler = require('./middleware/errorHandler');
const watchReadingChanges = require('./sockets/changeStream');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN
  }
});

// CORS setup
app.use(cors({
  origin: CLIENT_ORIGIN
}));

// Body parser
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
app.use('/api/readings', readingsRouter);

// Centralized error handler
app.use(errorHandler);

// Connect to MongoDB before starting real-time services.
connectDB().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    watchReadingChanges(io);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
});

module.exports = app;
