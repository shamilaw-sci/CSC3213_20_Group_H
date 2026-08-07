const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboard");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Fixed: CORS restricted to frontend origin (not wide open)
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});