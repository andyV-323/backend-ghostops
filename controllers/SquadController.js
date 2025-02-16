const Squad = require("../models/Squad");
const Operator = require("../models/Operator");

//CREATE a new Squad
exports.createSquad = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}
		const squad = new Squad({
			createdBy: userId,
			name: req.body.name,
			operators: req.body.operattors || [],
		});
		await squad.save();
		res.status(201).json({ message: "Squad created successfully!", squad });
	} catch (error) {
		console.error("Error Creating Squad:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// GET all squads for the logged-in user
exports.getSquads = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const squads = await Squad.find({ createdBy: userId }).populate(
			"operators"
		);
		res.status(200).json(squads);
	} catch (error) {
		console.error("Error Fetching Teams:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// GET a single Squad by ID (only if user created it)
exports.getSquadById = async (req, res) => {
	try {
		const userId = req.userId;
		const squadId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const squad = await Squad.findOne({
			_id: squadId,
			createdBy: userId,
		}).populate("operators");
		if (!squad) {
			return res
				.status(404)
				.json({ message: "Squad not found or unauthorized" });
		}

		res.status(200).json(team);
	} catch (error) {
		console.error(" Error Fetching Squad:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// UDATE a Squad
exports.updateSquad = async (req, res) => {
	try {
		const userId = req.userId;
		const squadId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const squad = await Squad.findOneAndUpdate(
			{ _id: squadId, createdBy: userId },
			req.body,
			{ new: true, runValidators: true }
		).populate("operators");

		if (!squad) {
			return res
				.status(404)
				.json({ message: "Squad not found or unauthorized" });
		}

		res.status(200).json({ message: "Squad updated successfully!", squad });
	} catch (error) {
		console.error("Error Updating Squad:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// DELETE a Squad
exports.deleteSquad = async (req, res) => {
	try {
		const userId = req.userId;
		const squadId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const squad = await Squad.findOneAndDelete({
			_id: squadId,
			createdBy: userId,
		});

		if (!squad) {
			return res
				.status(404)
				.json({ message: "Squad not found or unauthorized" });
		}

		res.status(200).json({ message: "Squad deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Squad:", error.message);
		res.status(500).json({ error: error.message });
	}
};
