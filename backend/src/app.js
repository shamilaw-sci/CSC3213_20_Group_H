const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 65000;
const HOST = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Mind-Ease API is running...');
});

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.post('/api/logs', (req, res) => {
  const { message, severity = 'info', metadata = {} } = req.body || {};

  const normalizedSeverity = String(severity).toLowerCase();
  const flaggedSeverity = ['critical', 'high', 'error'].includes(normalizedSeverity)
    ? normalizedSeverity
    : 'info';

  console.log('[request-log]', JSON.stringify({
    message,
    severity: flaggedSeverity,
    metadata,
    timestamp: new Date().toISOString(),
  }));

  res.status(201).json({
    success: true,
    message: 'Request logged successfully',
    severity: flaggedSeverity,
  });
});

app.post('/api/help', (req, res) => {
  const { message = 'Emergency help requested', metadata = {} } = req.body || {};

  console.log('[help-request]', JSON.stringify({
    message,
    metadata,
    timestamp: new Date().toISOString(),
  }));

  res.status(200).json({
    success: true,
    message: 'Help request received',
  });
});

const startServer = (port) => {
  const server = app.listen(port, HOST, () => {
    console.log(`Server is running on http://${HOST}:${port}`);
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down server...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please stop the existing server and try again.`);
      process.exit(1);
    } else {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

  return server;
};

const server = startServer(PORT);