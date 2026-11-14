import express from "express";
import {
  getStudentSessions,
  getAllAppointments,
} from "../controllers/sessionController.js";

const router = express.Router();

router.get(
  "/appointments",
  getAllAppointments
);

router.get(
  "/:studentId",
  getStudentSessions
);

export default router;