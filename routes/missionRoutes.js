// routes/missionRoutes.js
const express = require("express");
const router = express.Router();
const {
	getMissions,
	getMissionById,
	createMission,
	updateMission,
	deleteMission,
} = require("../controllers/MissionController");

// Apply auth middleware to all routes

router.route("/").get(getMissions).post(createMission);

router
	.route("/:id")
	.get(getMissionById)
	.put(updateMission)
	.delete(deleteMission);

module.exports = router;
