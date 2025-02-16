const Infirmary = require("../models/Infirmary");
const Operator = require("../models/Operator");

const express = require("express");
const router = express.Router();
const infirmaryController = require("../controllers/InfirmaryController");

//API Routes for Infirmary
router.post("/", infirmaryController.addInjuredOperator);
router.get("/", infirmaryController.getInjuredOperators);
router.get("/:id", infirmaryController.getInjuredOperatorById);
router.put("/:id", infirmaryController.updateInjury);
router.delete("/:id", infirmaryController.removeInjuredOperator);
router.get("/", async (req, res) => {
	try {
		const injuredOperators = await Infirmary.find().populate(
			"operator",
			"name image"
		);
		res.json(injuredOperators);
	} catch (error) {
		console.error("ERROR fetching injured operators:", error);
		res.status(500).json({ error: "Failed to fetch injured operators" });
	}
});

router.put("/recover/:id", async (req, res) => {
	try {
		const { id } = req.params;

		// Find the infirmary record
		const infirmaryEntry = await Infirmary.findById(id);
		if (!infirmaryEntry) {
			return res.status(404).json({ error: "Injury record not found" });
		}

		// Update the operator's status to "Active"
		await Operator.findByIdAndUpdate(infirmaryEntry.operator, {
			status: "Active",
		});

		// Remove the infirmary entry after recovery
		await Infirmary.findByIdAndDelete(id);

		res.json({ message: "Operator recovered successfully" });
	} catch (error) {
		console.error("ERROR recovering operator:", error);
		res.status(500).json({ error: "Failed to recover operator" });
	}
});
module.exports = router;
