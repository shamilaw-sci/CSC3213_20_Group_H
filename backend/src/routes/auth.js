import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { SECRET } from "../config.js"; // ✅ Fixed: uses shared config

const router = express.Router();

// TODO: Replace hardcoded demo user with actual database lookup
const DEMO_USER = {
  id: 1,
  email: "test@gmail.com",
  // ✅ Fixed: password stored as bcrypt hash, not plain text
  // This hash represents "1234" — generate your own with bcrypt.hashSync("yourpassword", 10)
  passwordHash: bcrypt.hashSync("1234", 10),
};

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // ✅ Fixed: using bcrypt.compare() instead of plain text comparison
  const isEmailMatch = email === DEMO_USER.email;
  const isPasswordMatch = await bcrypt.compare(password, DEMO_USER.passwordHash);

  if (!isEmailMatch || !isPasswordMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: DEMO_USER.id, email },
    SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

export default router;