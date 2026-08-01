const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Mind-Ease API is running...");
});

// Authentication Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Application Logs
app.post("/api/logs", (req, res) => {
  const {
    message,
    severity = "info",
    metadata = {},
  } = req.body || {};

  const normalizedSeverity =
    String(severity).toLowerCase();

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

// Emergency Help Route
app.post("/api/help", (req, res) => {
  const {
    message = "Emergency help requested",
    metadata = {},
  } = req.body || {};

  console.log(
    "[help-request]",
    JSON.stringify({
      message,
      metadata,
      timestamp: new Date().toISOString(),
    })
  );

  res.status(200).json({
    success: true,
    message: "Help request received",
  });
});

module.exports = app;
