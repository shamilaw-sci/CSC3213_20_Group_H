import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "mysecretkey";

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // demo user (replace DB later)
  if (email !== "test@gmail.com" || password !== "1234") {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: 1, email },
    SECRET,
    { expiresIn: "1h" } // expiry handling
  );

  res.json({ token });
});

export default router;