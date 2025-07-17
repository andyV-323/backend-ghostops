/** @format */

const Team = require("../models/Team");
const Operator = require("../models/Operator");
const mongoose = require("mongoose");

/// POST a new team
exports.createTeam = async (req, res) => {
	try {
		console.log("Incoming CREATE Team Request:", req.body);

		// Validate required fields - INCLUDE AO in destructuring
		const { createdBy, name, operators, AO } = req.body;
		if (!createdBy || !name || !Array.isArray(operators)) {
			return res
				.status(400)
				.json({ error: "Missing required fields: createdBy, name, operators" });
		}

		//valid MongoDB ObjectIds
		const validOperatorIds = operators.filter((opId) =>
			mongoose.Types.ObjectId.isValid(opId)
		);

		const newTeam = new Team({
			createdBy,
			name,
			operators: validOperatorIds,
			AO: AO || "", // Include AO in the new team creation
		});

		await newTeam.save();

		res
			.status(201)
			.json({ message: "Team created successfully!", team: newTeam });
	} catch (error) {
		console.error("Error Creating Team:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// GET all teams for the logged-in user
exports.getTeams = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}
		// Fix the populate - AO is not a reference field, it's a simple string
		const teams = await Team.find({ createdBy: userId }).populate(
			"operators",
			"callSign image name"
		);

		res.json(teams);
	} catch (error) {
		console.error("ERROR fetching teams:", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// GET a single team by ID
exports.getTeamById = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const team = await Team.findOne({
			_id: teamId,
			createdBy: userId,
		}).populate("operators");
		if (!team) {
			return res
				.status(404)
				.json({ message: "Team not found or unauthorized" });
		}

		res.status(200).json({ data: team }); // Wrap in data object to match frontend expectation
	} catch (error) {
		console.error("Error Fetching Team:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// UPDATE a Team
exports.updateTeam = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const team = await Team.findOneAndUpdate(
			{ _id: teamId, createdBy: userId },
			req.body,
			{ new: true, runValidators: true }
		).populate("operators");

		if (!team) {
			return res
				.status(404)
				.json({ message: "Team not found or unauthorized" });
		}

		res.status(200).json({ message: "Team updated successfully!", team });
	} catch (error) {
		console.error("Error Updating Team:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// DELETE a Team
exports.deleteTeam = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const team = await Team.findOneAndDelete({
			_id: teamId,
			createdBy: userId,
		});

		if (!team) {
			return res
				.status(404)
				.json({ message: "Team not found or unauthorized" });
		}

		res.status(200).json({ message: "Team deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Team:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// REMOVE an operator from all teams
exports.removeOperatorFromTeams = async (req, res) => {
	try {
		const { operatorId } = req.params;
		if (!operatorId) {
			return res.status(400).json({ error: "Missing operatorId" });
		}

		// UPDATE all teams by pulling this operator from their "operators" array
		const result = await Team.updateMany(
			{ operators: operatorId },
			{ $pull: { operators: operatorId } }
		);

		res
			.status(200)
			.json({ message: "Operator removed from all teams", result });
	} catch (error) {
		console.error("Error removing operator from teams:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
