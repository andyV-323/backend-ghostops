const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/OperatorController");
const Operator = require("../models/Operator");
const upload = require("../middleware/uploadMiddleware");
const { uploadImageToS3, deleteImageFromS3 } = require("../utils/S3utils");

/**
 * IMPORTANT:
 * Put fixed routes BEFORE "/:id" routes
 * or "/:id" will catch "upload-image" as an id.
 */

// ✅ IMAGE ROUTES (fixed paths FIRST)
router.post("/upload-image", upload.single("image"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No image file provided" });
		}

		console.log("=== IMAGE UPLOAD START ===");
		console.log("Original filename:", req.file.originalname);
		console.log("File size:", req.file.size, "bytes");
		console.log("MIME type:", req.file.mimetype);

		const imageUrl = await uploadImageToS3(
			req.file.buffer,
			req.file.originalname,
		);

		console.log("S3 URL:", imageUrl);
		console.log("=== IMAGE UPLOAD END ===");

		res.status(200).json({
			message: "Image uploaded successfully",
			imageUrl,
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		res.status(500).json({
			error: "Failed to upload image",
			details: error.message,
		});
	}
});

router.delete("/delete-image", async (req, res) => {
	try {
		const { imageUrl } = req.body;

		if (!imageUrl) {
			return res.status(400).json({ error: "Invalid image URL" });
		}

		await deleteImageFromS3(imageUrl);

		res.status(200).json({ message: "Image deleted successfully" });
	} catch (error) {
		console.error("Error deleting image:", error);
		res.status(500).json({ error: "Failed to delete image" });
	}
});

// ✅ BIO + STATUS ROUTES (also fixed paths FIRST)
router.put("/:id/bio", async (req, res) => {
	try {
		const { id } = req.params;
		const { bio } = req.body;

		if (!bio) {
			return res.status(400).json({ error: "Bio content is required." });
		}

		const updatedOperator = await Operator.findByIdAndUpdate(
			id,
			{ bio },
			{ new: true },
		);

		if (!updatedOperator) {
			return res.status(404).json({ error: "Operator not found" });
		}

		res.json(updatedOperator);
	} catch (error) {
		console.error("ERROR updating operator bio:", error);
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
			{ new: true },
		);

		if (!updatedOperator) {
			return res.status(404).json({ error: "Operator not found" });
		}

		res.json(updatedOperator);
	} catch (error) {
		console.error("ERROR updating operator status:", error);
		res.status(500).json({ error: "Failed to update status" });
	}
});

router.put("/:id/condition", async (req, res) => {
	try {
		const { id } = req.params;
		const { conditionLevel, fatiguePoints } = req.body;

		const valid = ["Fresh", "Steady", "Worn", "Degraded", "Spent"];
		if (!conditionLevel || !valid.includes(conditionLevel)) {
			return res.status(400).json({ error: "Invalid conditionLevel" });
		}

		const update = { conditionLevel };
		if (typeof fatiguePoints === "number" && fatiguePoints >= 0) {
			update.fatiguePoints = fatiguePoints;
		}

		const updated = await Operator.findByIdAndUpdate(
			id,
			{ $set: update },
			{ new: true },
		);

		if (!updated) return res.status(404).json({ error: "Operator not found" });

		res.json(updated);
	} catch (error) {
		console.error("ERROR updating operator condition:", error);
		res.status(500).json({ error: "Failed to update condition" });
	}
});

// Inline helpers — mirrors frontend config/fatigue.js thresholds
function calcConditionLevel(points) {
	const thresholds = [0, 4, 8, 12, 16];
	const levels = ["Fresh", "Steady", "Worn", "Degraded", "Spent"];
	let level = "Fresh";
	for (let i = thresholds.length - 1; i >= 0; i--) {
		if (points >= thresholds[i]) { level = levels[i]; break; }
	}
	return level;
}

function restTarget(points) {
	// CI (>=11) → top of Degraded band (10); Degraded (6-10) → top of Ready band (5); Ready → 0
	if (points >= 11) return 10;
	if (points >= 6) return 5;
	return 0;
}

// ✅ REST ROUTE — reduce fatigue by one readiness band
router.put("/:id/rest", async (req, res) => {
	try {
		const { id } = req.params;
		const operator = await Operator.findById(id);
		if (!operator) return res.status(404).json({ error: "Operator not found" });

		const newPoints = restTarget(operator.fatiguePoints ?? 0);
		const newLevel = calcConditionLevel(newPoints);

		const updated = await Operator.findByIdAndUpdate(
			id,
			{ $set: { fatiguePoints: newPoints, conditionLevel: newLevel } },
			{ new: true },
		);

		res.json(updated);
	} catch (error) {
		console.error("ERROR resting operator:", error);
		res.status(500).json({ error: "Failed to rest operator" });
	}
});

// ✅ BASE CRUD ROUTES
router.post("/", operatorController.createOperator);
router.get("/", operatorController.getOperators);

// ✅ ID ROUTES MUST BE LAST
router.get("/:id", operatorController.getOperatorById);
router.put("/:id", operatorController.updateOperator);
router.delete("/:id", operatorController.deleteOperator);

module.exports = router;
