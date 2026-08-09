const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 5000);
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

const startServer = (port = DEFAULT_PORT, attempt = 0) => {
  const server = app.listen(port, HOST, () => {
    const address = server.address();
    const actualPort = address && typeof address === 'object' ? address.port : port;
    console.log(`Server is running on port ${actualPort}`);
  });

  server.on('error', (error) => {
    const retryableCodes = ['EADDRINUSE', 'EACCES', 'EPERM'];

    if (retryableCodes.includes(error.code) && attempt < 5) {
      const nextPort = port === 0 ? 0 : port + 1;
      console.warn(`Port ${port} is unavailable (${error.code}). Trying ${nextPort}...`);
      if (server.listening) {
        server.close(() => startServer(nextPort, attempt + 1));
      } else {
        startServer(nextPort, attempt + 1);
      }
      return;
    }

    console.error('Failed to start server:', error);
    setTimeout(() => startServer(0, attempt + 1), 1000);
  });
};

startServer();

module.exports = app;

// Define PORT from environment variables with a fallback to 5000
const PORT = process.env.PORT || 5000;

const server = startServer(PORT);