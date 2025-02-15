/** @format */

const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/OperatorController");
const Operator = require("../models/Operator"); // ✅ Import the Operator model

// Define Routes
router.post("/", operatorController.createOperator);
router.get("/", operatorController.getOperators);
router.get("/:id", operatorController.getOperatorById);
router.put("/:id", operatorController.updateOperator);
router.delete("/:id", operatorController.deleteOperator);

// ✅ Fix: Update Operator Bio Route
router.put("/:id/bio", async (req, res) => {
	try {
		const { id } = req.params;
		const { bio } = req.body;

		// ✅ Ensure `bio` is provided
		if (!bio) {
			return res.status(400).json({ error: "Bio content is required." });
		}

		const updatedOperator = await Operator.findByIdAndUpdate(
			id,
			{ bio },
			{ new: true }
		);

		if (!updatedOperator) {
			return res.status(404).json({ error: "Operator not found" });
		}

		res.json(updatedOperator);
	} catch (error) {
		console.error("❌ ERROR updating operator bio:", error);
		res.status(500).json({ error: "Failed to update bio" });
	}
});
router.put("/:id/status", async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		const updatedOperator = await Operator.findByIdAndUpdate(
			id,
			{ status },
			{ new: true }
		);

		if (!updatedOperator) {
			return res.status(404).json({ error: "Operator not found" });
		}

		res.json(updatedOperator);
	} catch (error) {
		console.error("❌ ERROR updating operator status:", error);
		res.status(500).json({ error: "Failed to update status" });
	}
});

module.exports = router;
