/** @format */

const Memorial = require("../models/Memorial");
const Operator = require("../models/Operator");

//POST Operator to Memorial
exports.addToMemorial = async (req, res) => {
	try {
		const userId = req.userId; // Extracted from the token middleware
		const { createdBy, operator, name, dateOfDeath } = req.body;
		// Ensure the operator exists in the database
		const existingOperator = await Operator.findById(operator);
		if (!existingOperator) {
			return res.status(404).json({ message: "Operator not found" });
		}

		// Ensure the operator is KIA before adding to memorial
		if (existingOperator.status !== "KIA") {
			return res.status(400).json({ message: "Operator is not KIA" });
		}

		// Check if operator is already in Memorial
		const existingMemorial = await Memorial.findOne({ operator });
		if (existingMemorial) {
			return res.status(400).json({ message: "Operator already in Memorial" });
		}

		// Add operator to Memorial collection
		const memorialEntry = new Memorial({
			createdBy: userId,
			operator,
			name,
			dateOfDeath: dateOfDeath || Date.now(),
		});

		await memorialEntry.save();
		console.log("✅ Operator added to Memorial:", memorialEntry);
		res.status(201).json(memorialEntry);
	} catch (error) {
		console.error("❌ ERROR adding to Memorial:", error);
		res.status(500).json({ message: "Server Error", error: error.message });
	}
};

//GET All Memorialized Operators
exports.getMemorializedOperators = async (req, res) => {
	try {
		const userId = req.userId;
		console.log(
			`Incoming GET Request for Memorialized Operators from User: ${userId}`
		);

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const memorialList = await Memorial.find({ createdBy: userId }).populate(
			"operator"
		);
		console.log("Retrieved Memorialized Operators:", memorialList);
		res.status(200).json(memorialList);
	} catch (error) {
		console.error("Error Fetching Memorial Data:", error.message);
		res.status(500).json({ error: error.message });
	}
};

//GET a Single Memorialized Operator by ID
exports.getMemorializedOperatorById = async (req, res) => {
	try {
		const userId = req.userId;
		const memorialId = req.params.id;
		console.log(`Incoming GET Request for Memorial Operator ID: ${memorialId}`);

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const memorializedOperator = await Memorial.findOne({
			_id: memorialId,
			createdBy: userId,
		}).populate("operator");
		if (!memorializedOperator) {
			return res
				.status(404)
				.json({ message: "Memorialized Operator not found or unauthorized" });
		}

		res.status(200).json(memorializedOperator);
	} catch (error) {
		console.error("Error Fetching Memorialized Operator:", error.message);
		res.status(500).json({ error: error.message });
	}
};

//DELETE an Operator from the Memorial
exports.removeFromMemorial = async (req, res) => {
	try {
		const userId = req.userId;
		const memorialId = req.params.id;
		console.log(
			`Incoming DELETE Request for Memorial Operator ID: ${memorialId}`
		);

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const deletedOperator = await Memorial.findOneAndDelete({
			_id: memorialId,
			createdBy: userId,
		});

		if (!deletedOperator) {
			return res
				.status(404)
				.json({ message: "Memorialized Operator not found or unauthorized" });
		}

		console.log("Operator Removed from Memorial:", deletedOperator);
		res
			.status(200)
			.json({ message: "Operator removed from memorial successfully!" });
	} catch (error) {
		console.error("Error Removing Operator from Memorial:", error.message);
		res.status(500).json({ error: error.message });
	}
};
