import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured in the environment.");
}

export const SECRET = process.env.JWT_SECRET;