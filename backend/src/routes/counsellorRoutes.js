import express from "express";

import {
  getCounsellors,
  getAvailability,
  bookAppointment,
  getEmergencyAvailability,
  updateEmergencyAvailability,
} from "../controllers/counsellorController.js";
import { authMiddleware } from "../auth/authMiddleware.js";
import { requireRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get(
  "/me/emergency-availability",
  authMiddleware,
  requireRoles("counsellor"),
  getEmergencyAvailability
);

router.put(
  "/me/emergency-availability",
  authMiddleware,
  requireRoles("counsellor"),
  updateEmergencyAvailability
);

router.get("/", getCounsellors);

router.get(
  "/:id/availability",
  getAvailability
);

router.post(
  "/book",
  bookAppointment
);

export default router;