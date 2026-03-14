// controllers/missionController.js
const Mission = require("../models/Mission");

// ─── GET /api/missions ────────────────────────────────────────────────────────
// @desc  Get all missions for the authenticated user (lightweight list)
// @access Private

exports.getMissions = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		// Exclude full briefingText, phase notes, and AAR from list response —
		// frontend only needs these for the detail view.
		const missions = await Mission.find({ createdBy: userId })
			.select("-briefingText -phases.notes -phases.generatorSnapshot -aar")
			.sort({ createdAt: -1 });

		res.status(200).json(missions);
	} catch (error) {
		console.error("Error fetching missions:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── GET /api/missions/:id ────────────────────────────────────────────────────
// @desc  Get a single mission with full data including all phases and AAR
// @access Private

exports.getMissionById = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		});

		if (!mission) {
			return res.status(404).json({ message: "Mission not found" });
		}

		res.status(200).json({ mission });
	} catch (error) {
		console.error("Error fetching mission:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── POST /api/missions ───────────────────────────────────────────────────────
// @desc  Create a new mission — only name required at creation time
// @access Private

exports.createMission = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const { name } = req.body;
		if (!name?.trim()) {
			return res.status(400).json({ message: "Mission name is required" });
		}

		const mission = new Mission({
			createdBy: userId,
			name: name.trim(),
			status: "planning",
		});

		await mission.save();

		res.status(201).json({
			message: "Mission created successfully",
			mission,
		});
	} catch (error) {
		console.error("Error creating mission:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── PUT /api/missions/:id ────────────────────────────────────────────────────
// @desc  Update mission fields — generator, briefingText, status, province,
//        biome, missionType, notes, aar
// @access Private

exports.updateMission = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const {
			name,
			status,
			province,
			biome,
			generator,
			briefingText,
			aar,
			notes,
		} = req.body;

		const patch = {};
		if (name !== undefined) patch.name = name.trim();
		if (status !== undefined) patch.status = status;
		if (province !== undefined) patch.province = province;
		if (biome !== undefined) patch.biome = biome;
		if (generator !== undefined) patch.generator = generator;
		if (briefingText !== undefined) patch.briefingText = briefingText;
		if (aar !== undefined) patch.aar = aar;
		if (notes !== undefined) patch.notes = notes;

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{ $set: patch },
			{ new: true, runValidators: true },
		);

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json({ message: "Mission updated", mission });
	} catch (error) {
		console.error("Error updating mission:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── DELETE /api/missions/:id ─────────────────────────────────────────────────
// @desc  Delete a mission and all its phases
// @access Private

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

		res.status(200).json({ message: "Mission deleted successfully" });
	} catch (error) {
		console.error("Error deleting mission:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── POST /api/missions/:id/phases ────────────────────────────────────────────
// @desc  Append a completed phase report to a mission
// @access Private

exports.addPhase = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const {
			phaseNumber,
			province,
			missionType,
			objectives,
			outcome,
			complications,
			casualties,
			casualtyNote,
			intelDeveloped,
			notes,
			generatorSnapshot,
			createdAt,
		} = req.body;

		// outcome and casualties are required
		if (!outcome) {
			return res.status(400).json({ message: "Phase outcome is required" });
		}
		if (!casualties) {
			return res.status(400).json({ message: "Casualty status is required" });
		}

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{
				$push: {
					phases: {
						phaseNumber: phaseNumber ?? 1,
						province: province ?? "",
						missionType: missionType ?? "",
						objectives: objectives ?? [],
						outcome,
						complications: complications ?? [],
						casualties,
						casualtyNote: casualtyNote ?? "",
						intelDeveloped: intelDeveloped ?? [],
						notes: notes ?? "",
						generatorSnapshot: generatorSnapshot ?? {},
						createdAt: createdAt ? new Date(createdAt) : new Date(),
					},
				},
			},
			{ new: true, runValidators: true },
		);

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		// Return the newly appended phase
		const newPhase = mission.phases[mission.phases.length - 1];

		res.status(201).json({
			message: `Phase ${newPhase.phaseNumber} filed`,
			phase: newPhase,
		});
	} catch (error) {
		console.error("Error saving phase:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── DELETE /api/missions/:id/phases/:phaseId ─────────────────────────────────
// @desc  Remove a specific phase from a mission
// @access Private

exports.deletePhase = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{ $pull: { phases: { _id: req.params.phaseId } } },
			{ new: true },
		);

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json({
			message: "Phase deleted",
			totalPhases: mission.phases.length,
		});
	} catch (error) {
		console.error("Error deleting phase:", error.message);
		res.status(500).json({ error: error.message });
	}
};
