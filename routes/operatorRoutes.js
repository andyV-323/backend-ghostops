const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/OperatorController");
const Operator = require("../models/Operator");
const upload = require("../middleware/uploadMiddleware");
const { uploadImageToS3, deleteImageFromS3 } = require("../utils/S3utils");

// Define Routes
router.post("/", operatorController.createOperator);
router.get("/", operatorController.getOperators);
router.get("/:id", operatorController.getOperatorById);
router.put("/:id", operatorController.updateOperator);
router.delete("/:id", operatorController.deleteOperator);

// Image Upload Route - S3 Version
router.post("/upload-image", upload.single("image"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No image file provided" });
		}

		console.log("=== IMAGE UPLOAD START ===");
		console.log("Original filename:", req.file.originalname);
		console.log("File size:", req.file.size, "bytes");
		console.log("MIME type:", req.file.mimetype);

		// Upload to S3 (includes compression)
		const imageUrl = await uploadImageToS3(
			req.file.buffer,
			req.file.originalname,
		);

		console.log("S3 URL:", imageUrl);
		console.log("=== IMAGE UPLOAD END ===");

		res.status(200).json({
			message: "Image uploaded successfully",
			imageUrl: imageUrl,
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		res.status(500).json({
			error: "Failed to upload image",
			details: error.message,
		});
	}
});

// Delete Image Route - S3 Version
router.delete("/delete-image", async (req, res) => {
	try {
		const { imageUrl } = req.body;

		if (!imageUrl) {
			return res.status(400).json({ error: "Invalid image URL" });
		}

		// Delete from S3
		await deleteImageFromS3(imageUrl);

		res.status(200).json({ message: "Image deleted successfully" });
	} catch (error) {
		console.error("Error deleting image:", error);
		res.status(500).json({ error: "Failed to delete image" });
	}
});

// Update Operator Bio Route
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

// Update Status Route
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

module.exports = router;
