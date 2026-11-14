import express from "express";
import rateLimit from "express-rate-limit";
import {
  getAvailabilitySlots,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../controllers/availabilityController.js";

const router = express.Router();
const availabilityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(availabilityLimiter);

router.get(
  "/",
  getAvailabilitySlots
);

router.post(
  "/",
  createAvailability
);

router.put("/:id", updateAvailability);

router.delete(
  "/:id",
  deleteAvailability
);

export default router;