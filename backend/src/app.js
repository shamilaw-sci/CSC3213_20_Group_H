const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Session middleware (required for Passport)
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.post('/', (req, res) => {
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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});