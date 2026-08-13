import express from "express";

import {
  getCounsellors,
  getAvailability,
  bookAppointment,
} from "../controllers/counsellorController.js";

const router = express.Router();

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