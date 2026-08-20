require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const readingsRouter = require('./routes/readings');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS setup
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
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

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
