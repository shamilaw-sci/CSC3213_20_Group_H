import express from "express";
import {
  getAvailabilitySlots,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "../controllers/availabilityController.js";

const router = express.Router();

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