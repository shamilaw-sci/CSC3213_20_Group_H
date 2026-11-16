import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in the environment.");
}

export const SECRET = process.env.JWT_SECRET;

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];