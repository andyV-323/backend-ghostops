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

module.exports = router;
