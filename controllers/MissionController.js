const Mission = require("../models/Mission");
const Team = require("../models/Team");

//POST a New Mission
exports.createMission = async (req, res) => {
	try {
		//Cognito User ID
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		//Validate Assigned Teams
		const assignedTeams = await Team.find({
			_id: { $in: req.body.assignedTeams },
			createdBy: userId,
		});
		if (assignedTeams.length !== req.body.assignedTeams.length) {
			return res
				.status(400)
				.json({ message: "Invalid or unauthorized team assignments" });
		}

		//POST Mission
		const mission = new Mission({
			createdBy: userId,
			name: req.body.name,
			wasSuccessful: req.body.wasSuccessful,
			kiaCount: req.body.kiaCount,
			injuredCount: req.body.injuredCount,
			assignedTeams: req.body.assignedTeams,
			roles: req.body.roles,
			date: req.body.date || Date.now(),
		});

		await mission.save();

		res.status(201).json({ message: "Mission created successfully!", mission });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

//GET All Missions for the Logged-in User
exports.getMissions = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const missions = await Mission.find({ createdBy: userId }).populate(
			"assignedTeams"
		);

		res.status(200).json(missions);
	} catch (error) {
		console.error("Error Fetching Missions:", error.message);
		res.status(500).json({ error: error.message });
	}
};

//GET a Single Mission by ID
exports.getMissionById = async (req, res) => {
	try {
		const userId = req.userId;
		const missionId = req.params.id;
		console.log(`Incoming GET Request for Mission ID: ${missionId}`);

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const mission = await Mission.findOne({
			_id: missionId,
			createdBy: userId,
		}).populate("assignedTeams");
		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json(mission);
	} catch (error) {
		console.error("Error Fetching Mission:", error.message);
		res.status(500).json({ error: error.message });
	}
};

//UPDATE a Mission
exports.updateMission = async (req, res) => {
	try {
		const userId = req.userId;
		const missionId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const updatedMission = await Mission.findOneAndUpdate(
			{ _id: missionId, createdBy: userId },
			req.body,
			{ new: true, runValidators: true }
		).populate("assignedTeams");

		if (!updatedMission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		console.log("Mission Updated:", updatedMission);
		res
			.status(200)
			.json({ message: "Mission updated successfully!", updatedMission });
	} catch (error) {
		console.error("Error Updating Mission:", error.message);
		res.status(400).json({ error: error.message });
	}
};

//DELETE a Mission
exports.deleteMission = async (req, res) => {
	try {
		const userId = req.userId;
		const missionId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const deletedMission = await Mission.findOneAndDelete({
			_id: missionId,
			createdBy: userId,
		});

		if (!deletedMission) {
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
