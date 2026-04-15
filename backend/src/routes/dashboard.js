import express from "express";
import { authMiddleware } from "../auth/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  res.json({
    message: "Protected dashboard data",
    user: req.user
  });
});

export default router;