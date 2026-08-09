import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";

dotenv.config();

const app = express();

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
    secret: process.env.JWT_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    res.send('Mind-Ease API is running...');
});

// Authentication Routes
app.use("/api/auth", authRoutes);

// Production Emergency Support Route (SRS 6.7)
app.use("/api/emergency", emergencyRoutes);

app.post("/api/logs", (req, res) => {
  const {
    message,
    severity = "info",
    metadata = {},
  } = req.body || {};

  const normalizedSeverity = String(severity).toLowerCase();

  const flaggedSeverity = [
    "critical",
    "high",
    "error",
  ].includes(normalizedSeverity)
    ? normalizedSeverity
    : "info";

  console.log(
    "[request-log]",
    JSON.stringify({
      message,
      severity: flaggedSeverity,
      metadata,
      timestamp: new Date().toISOString(),
    })
  );

  res.status(201).json({
    success: true,
    message: "Request logged successfully",
    severity: flaggedSeverity,
  });
});

export default app;