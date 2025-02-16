const Memorial = require("../models/Memorial");
const Operator = require("../models/Operator");

//POST Operator to Memorial
exports.addToMemorial = async (req, res) => {
	try {
		const userId = req.userId;
		const { createdBy, operator, name, dateOfDeath } = req.body;
		// operator exists in the database
		const existingOperator = await Operator.findById(operator);
		if (!existingOperator) {
			return res.status(404).json({ message: "Operator not found" });
		}

		// if KIA add to memorial schema
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
		res.status(201).json(memorialEntry);
	} catch (error) {
		console.error("ERROR adding to Memorial:", error);
		res.status(500).json({ message: "Server Error", error: error.message });
	}
};

//GET All Memorial schema Operators
exports.getMemorializedOperators = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const memorialList = await Memorial.find({ createdBy: userId }).populate(
			"operator"
		);
		res.status(200).json(memorialList);
	} catch (error) {
		console.error("Error Fetching Memorial Data:", error.message);
		res.status(500).json({ error: error.message });
	}
};

//GET a Single Memorial Operator by ID
exports.getMemorializedOperatorById = async (req, res) => {
	try {
		const userId = req.userId;
		const memorialId = req.params.id;

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
