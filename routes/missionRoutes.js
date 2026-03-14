// routes/missionRoutes.js
const express = require("express");
const router = express.Router();
const {
	getMissions,
	getMissionById,
	createMission,
	updateMission,
	deleteMission,
	addPhase,
	deletePhase,
} = require("../controllers/MissionController");

// ─── Mission CRUD ─────────────────────────────────────────────────────────────

router.route("/").get(getMissions).post(createMission);

router
	.route("/:id")
	.get(getMissionById)
	.put(updateMission)
	.delete(deleteMission);

// ─── Phase reports ────────────────────────────────────────────────────────────
// POST   /api/missions/:id/phases           — file a new phase report
// DELETE /api/missions/:id/phases/:phaseId  — remove a phase

router.route("/:id/phases").post(addPhase);
router.route("/:id/phases/:phaseId").delete(deletePhase);

module.exports = router;
