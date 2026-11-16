import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import passport from "./config/passport.js";
import { ALLOWED_ORIGINS } from "./config.js";

import authRoutes from "./routes/authRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import phq9Routes from "./routes/phq9Routes.js";
import voiceRoutes from "./routes/voiceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import clinicalRoutes from "./routes/clinicalRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
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

app.get("/", (req, res) => {
  res.send("Mind-Ease API is running...");
});

app.use("/api/auth", authRoutes);

app.use("/api/emergency", emergencyRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/counsellors", counsellorRoutes);

app.use("/api/sessions", sessionRoutes);

app.use("/api/availability", availabilityRoutes);

app.use("/api/phq9", phq9Routes);

app.use("/api/voice", voiceRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/clinical", clinicalRoutes);

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

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "Uploaded file exceeds the 10 MB size limit.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;