// controllers/missionController.js
const Mission = require("../models/Mission");

// ─── GET /api/missions ────────────────────────────────────────────────────────

exports.getMissions = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const missions = await Mission.find({ createdBy: userId })
			.select("-briefingText -phases.notes -phases.generatorSnapshot -aar -advisory")
			.sort({ createdAt: -1 });

		res.status(200).json(missions);
	} catch (error) {
		console.error("Error fetching missions:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── GET /api/missions/:id ────────────────────────────────────────────────────

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

exports.updateMission = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const {
			name, status, province, biome, generator,
			briefingText, aar, notes,
			// AI advisory fields
			aiGenerated, opType, advisory,
		} = req.body;

		const patch = {};

		if (name        !== undefined) patch.name        = name.trim();
		if (status      !== undefined) patch.status      = status;
		if (province    !== undefined) patch.province    = province;
		if (biome       !== undefined) patch.biome       = biome;
		if (generator   !== undefined) patch.generator   = generator;
		if (briefingText !== undefined) patch.briefingText = briefingText;
		if (aar         !== undefined) patch.aar         = aar;
		if (notes       !== undefined) patch.notes       = notes;
		if (aiGenerated !== undefined) patch.aiGenerated = aiGenerated;
		if (opType      !== undefined) patch.opType      = opType;
		if (advisory    !== undefined) patch.advisory    = advisory;

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{ $set: patch },
			{ new: true, runValidators: true },
		);

		if (!mission) {
			return res.status(404).json({ message: "Mission not found or unauthorized" });
		}

		res.status(200).json({ message: "Mission updated", mission });
	} catch (error) {
		console.error("Error updating mission:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── DELETE /api/missions/:id ─────────────────────────────────────────────────

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
// Appends a completed phase report.
// If mission is AI-generated, advances the campaign phase unlock chain.

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
			squadUsed,
			infilMethodUsed,
		} = req.body;

		if (!outcome) {
			return res.status(400).json({ message: "Phase outcome is required" });
		}
		if (!casualties) {
			return res.status(400).json({ message: "Casualty status is required" });
		}

		// Load the full mission so we can inspect campaignPhases
		const mission = await Mission.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		});

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		// ── Append the phase report ───────────────────────────────────────────
		const resolvedPhaseNumber = phaseNumber ?? mission.phases.length + 1;
		mission.phases.push({
			phaseNumber: resolvedPhaseNumber,
			province: province ?? "",
			missionType: missionType ?? "",
			objectives: objectives ?? [],
			outcome,
			complications: complications ?? [],
			casualties,
			casualtyNote: casualtyNote ?? "",
			intelDeveloped: intelDeveloped ?? [],
			notes: notes ?? "",
			squadUsed: squadUsed ?? "",
			infilMethodUsed: infilMethodUsed ?? "",
			generatorSnapshot: generatorSnapshot ?? {},
			createdAt: createdAt ? new Date(createdAt) : new Date(),
		});

		await mission.save();

		const newPhase = mission.phases[mission.phases.length - 1];

		res.status(201).json({
			message: `Phase ${newPhase.phaseNumber} filed`,
			phase: newPhase,
			missionStatus: mission.status,
		});
	} catch (error) {
		console.error("Error saving phase:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── DELETE /api/missions/:id/phases/:phaseId ─────────────────────────────────

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
