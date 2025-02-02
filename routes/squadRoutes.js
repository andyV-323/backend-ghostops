const express = require("express");
const router = express.Router();
const squadController = require("../controllers/SquadController");

//API Routes for Squads
router.post("/", squadController.createSquad);
router.get("/", squadController.getSquads);
router.get("/:id", squadController.getSquadById);
router.put("/:id", squadController.updateSquad);
router.delete("/:id", squadController.deleteSquad);

module.exports = router;
