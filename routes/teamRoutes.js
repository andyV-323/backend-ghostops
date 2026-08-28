const express = require("express");
const router = express.Router();
const teamController = require("../controllers/TeamController");
const { removeOperatorFromTeams } = require("../controllers/TeamController");

router.delete("/removeOperator/:operatorId", removeOperatorFromTeams);

//API Routes for Teams
router.post("/", teamController.createTeam);
router.get("/", teamController.getTeams);
router.get("/:id", teamController.getTeamById);
router.put("/:id", teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);

// Attach / detach teams
router.post("/:id/attach", teamController.attachTeam);
router.delete("/:id/attach/:attachedTeamId", teamController.detachTeam);

// Active-slot / reserve management
router.patch("/:id/assign-slot", teamController.assignSlot);
router.patch("/:id/reorder-reserve", teamController.reorderReserve);
router.patch("/:id/promote-reserve", teamController.promoteReserve);
router.patch("/:id/add", teamController.addToTeam);

module.exports = router;
