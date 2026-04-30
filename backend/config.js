import dotenv from "dotenv";
dotenv.config();

// ✅ Throws immediately if JWT_SECRET is missing — no silent fallback
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET is not defined in environment variables. Add it to your .env file.");
}

export const SECRET = process.env.JWT_SECRET;