const express = require("express");
const router = express.Router();
const {
	getSquads,
	getSquadById,
	createSquad,
	updateSquad,
	updateOperator,
	setActiveSquad,
	deleteSquad,
} = require("../controllers/SquadController");

router.get("/", getSquads);
router.get("/:id", getSquadById);
router.post("/", createSquad);
router.put("/:id", updateSquad);
router.patch("/active", setActiveSquad); // must be before /:id
router.patch("/:id/operators", updateOperator);
router.delete("/:id", deleteSquad);

module.exports = router;
