const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/OperatorController");
const Operator = require("../models/Operator");
const upload = require("../middleware/uploadMiddleware");
const { processImage, deleteImage } = require("../utils/imageUtils");
const path = require("path");

// Define Routes
router.post("/", operatorController.createOperator);
router.get("/", operatorController.getOperators);
router.get("/:id", operatorController.getOperatorById);
router.put("/:id", operatorController.updateOperator);
router.delete("/:id", operatorController.deleteOperator);

// Image Upload Route
router.post("/upload-image", upload.single("image"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No image file provided" });
		}

		console.log("Original file:", req.file.path);

		// Process (compress and resize) the image
		const processedPath = await processImage(req.file.path);

		console.log("Processed file:", processedPath);

		// Generate the URL path that will be stored in the database
		const imageUrl = `/uploads/operators/${path.basename(processedPath)}`;

		console.log("Image URL to save in DB:", imageUrl);

		res.status(200).json({
			message: "Image uploaded successfully",
			imageUrl: imageUrl,
			imagePath: processedPath,
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		res.status(500).json({ error: "Failed to upload image" });
	}
});

// Delete Image Route
router.delete("/delete-image", async (req, res) => {
	try {
		const { imagePath } = req.body;

		if (!imagePath || imagePath === "/ghost/Default.png") {
			return res.status(400).json({ error: "Invalid image path" });
		}

		// Convert URL path to file system path
		const fullPath = path.join(__dirname, "..", imagePath);
		await deleteImage(fullPath);

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
