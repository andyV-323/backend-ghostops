// controllers/missionController.js
const Mission = require("../models/Mission");

// @desc    Get all missions
// @route   GET /api/missions
// @access  Private
exports.getMissions = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const missions = await Mission.find({ createdBy: userId })
			.populate({
				path: "teams",
				populate: {
					path: "operators",
					model: "Operator",
				},
			})
			.populate({
				path: "teamRoles.teamId",
				populate: {
					path: "operators",
					model: "Operator",
				},
			})
			.sort({ createdAt: -1 });

		res.status(200).json(missions);
	} catch (error) {
		console.error("Error Fetching Missions:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// @desc    Get single mission
// @route   GET /api/missions/:id
// @access  Private
exports.getMissionById = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		})
			.populate({
				path: "teams",
				populate: {
					path: "operators",
					model: "Operator",
				},
			})
			.populate({
				path: "teamRoles.teamId",
				populate: {
					path: "operators",
					model: "Operator",
				},
			});

		if (!mission) {
			return res.status(404).json({ message: "Mission not found" });
		}

		res.status(200).json(mission);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// @desc    Create new mission
// @route   POST /api/missions
// @access  Private
exports.createMission = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const missionData = {
			createdBy: userId,
			name: req.body.name,
			teams: req.body.teams || [],
			teamRoles: req.body.teamRoles || [],
			status: req.body.status || "Recon",
			location: req.body.location,
		};

		// Create new mission using validated data
		const mission = new Mission(missionData);
		await mission.save();

		// Populate teams and operators before sending response
		const populatedMission = await Mission.findById(mission._id)
			.populate({
				path: "teams",
				populate: {
					path: "operators",
					model: "Operator",
				},
			})
			.populate({
				path: "teamRoles.teamId",
				populate: {
					path: "operators",
					model: "Operator",
				},
			});

		res.status(201).json({
			message: "Mission created successfully!",
			mission: populatedMission,
		});
	} catch (error) {
		console.error("Error Creating Mission:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// @desc    Update mission
// @route   PUT /api/missions/:id
// @access  Private
exports.updateMission = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true, runValidators: true }
		)
			.populate({
				path: "teams",
				populate: {
					path: "operators",
					model: "Operator",
				},
			})
			.populate({
				path: "teamRoles.teamId",
				populate: {
					path: "operators",
					model: "Operator",
				},
			});

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json({ message: "Mission updated!", mission });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// @desc    Delete mission
// @route   DELETE /api/missions/:id
// @access  Private
exports.deleteMission = async (req, res) => {
	try {
		const userId = req.userId;
		const missionId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOneAndDelete({
			_id: missionId,
			createdBy: userId,
		});

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json({ message: "Mission deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Mission:", error.message);
		res.status(500).json({ error: error.message });
	}
};
