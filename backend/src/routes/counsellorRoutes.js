const express = require("express");
const router = express.Router();

const {
  getCounsellors,
  getAvailability,
  bookAppointment,
} = require("../controllers/counsellorController");

router.get("/", getCounsellors);

router.get(
  "/:id/availability",
  getAvailability
);

router.post(
  "/book",
  bookAppointment
);

module.exports = router;