/** @format */

const express = require("express");
const router = express.Router();
const memorialController = require("../controllers/MemorialController");
const Memorial = require("../models/Memorial"); // ✅ Correct model import
const Operator = require("../models/Operator"); // ✅ Import Operator model

// ✅ GET all KIA operators from the Memorial
router.get("/operators", async (req, res) => {
	try {
		const { status } = req.query;

		// Validate status (should only be "KIA")
		if (status !== "KIA") {
			return res.status(400).json({ message: "Invalid status filter" });
		}

		// ✅ Fetch Memorial records and populate operator details
		const memorializedOperators = await Memorial.find()
			.populate("operator")
			.exec();

		// ✅ Filter for only KIA operators
		const KIAOperators = memorializedOperators.filter(
			(entry) => entry.operator && entry.operator.status === "KIA"
		);

		console.log("🟢 DEBUG: Retrieved KIA Operators ->", KIAOperators);

		res.status(200).json(KIAOperators);
	} catch (error) {
		console.error("❌ ERROR fetching KIA operators:", error.message);
		res.status(500).json({ message: "Internal Server Error" });
	}
});
// ✅ Recover Operator (Move from Memorial to Active)
router.put("/revive/:id", async (req, res) => {
	try {
		const memorialEntry = await Memorial.findById(req.params.id);

		if (!memorialEntry) {
			return res
				.status(404)
				.json({ message: "Operator not found in Memorial" });
		}

		// ✅ Update Operator status back to Active
		await Operator.findByIdAndUpdate(memorialEntry.operator, {
			status: "Active",
		});

		// ✅ Remove from Memorial collection
		await Memorial.deleteOne({ _id: req.params.id });

		console.log(`✅ Operator ${memorialEntry.operator} revived!`);
		res.status(200).json({ message: "Operator successfully revived!" });
	} catch (error) {
		console.error("❌ ERROR recovering operator:", error);
		res.status(500).json({ message: "Server Error", error: error.message });
	}
});

// ✅ Add operator to Memorial
router.post("/", memorialController.addToMemorial);

// ✅ GET specific Memorialized Operator by ID
router.get("/:id", memorialController.getMemorializedOperatorById);

// ✅ DELETE operator from Memorial
router.delete("/:id", memorialController.removeFromMemorial);

module.exports = router;
