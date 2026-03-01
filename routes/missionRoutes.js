// routes/missionRoutes.js
const express = require("express");
const router = express.Router();
const {
	getMissions,
	getMissionById,
	createMission,
	updateMission,
	deleteMission,
	addReconReport,
	deleteReconReport,
	getIntelAssessment,
} = require("../controllers/MissionController");

// ─── Mission CRUD ─────────────────────────────────────────────
router.route("/").get(getMissions).post(createMission);

router
	.route("/:id")
	.get(getMissionById)
	.put(updateMission)
	.delete(deleteMission);

// ─── Recon reports ────────────────────────────────────────────
router.route("/:id/recon").post(addReconReport);
router.route("/:id/recon/:reportId").delete(deleteReconReport);

// ─── Intel assessment (used by AI briefing) ───────────────────
router.route("/:id/intel").get(getIntelAssessment);

module.exports = router;
