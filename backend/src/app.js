import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import passport from "./config/passport.js";

import authRoutes from "./routes/authRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";

dotenv.config();

const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.JWT_SECRET || "fallback_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

/*
|--------------------------------------------------------------------------
| Root Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.send("Mind-Ease API is running...");
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication
app.use("/api/auth", authRoutes);

// Emergency Support
app.use("/api/emergency", emergencyRoutes);

// Patient-friendly counselling chatbot
app.use("/api/chat", chatRoutes);
// Admin
app.use("/api/admin", adminRoutes);

// Counsellors & Booking
app.use("/api/counsellors", counsellorRoutes);

// Session History
app.use("/api/sessions", sessionRoutes);

/*
|--------------------------------------------------------------------------
| Logs API
|--------------------------------------------------------------------------
*/

app.post("/api/logs", (req, res) => {
  const {
    message,
    severity = "info",
    metadata = {},
  } = req.body || {};

  const normalizedSeverity = String(severity).toLowerCase();

  const allowedSeverities = [
    "info",
    "warn",
    "warning",
    "error",
    "debug",
  ];

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Log message is required",
    });
  }

  if (!allowedSeverities.includes(normalizedSeverity)) {
    return res.status(400).json({
      success: false,
      message: "Invalid severity",
    });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    severity: normalizedSeverity,
    message,
    metadata,
  };

  console.log("[CLIENT LOG]", logEntry);

  return res.status(200).json({
    success: true,
    message: "Log received",
  });
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;