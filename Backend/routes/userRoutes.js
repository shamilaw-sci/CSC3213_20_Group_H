const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.get("/profile", protect, (req, res) => {
    res.json({
        message: "Protected data access granted",
        userId: req.user.id
    });
});

router.get(
    "/admin",
    protect,
    authorize("admin"),
    (req,res)=>{

        res.json({
            message:"Welcome Admin"
        });

});

router.get(
    "/counsellor",
    protect,
    authorize("counsellor"),
    (req, res) => {
        res.json({
            message: "Welcome Counsellor"
        });
    }
);

module.exports = router;