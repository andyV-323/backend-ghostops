// controllers/missionController.js
const Mission = require("../models/Mission");

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Aggregate all reconReports on a mission into a single intel assessment.
 * Used internally so the briefing generation route can call it too.
 */
const computeIntelAssessment = (reconReports = []) => {
	if (reconReports.length === 0) return null;

	const scores = reconReports.map((r) => r.modifiers?.intelScore ?? 0);
	const avgScore = Math.round(
		scores.reduce((a, b) => a + b, 0) / scores.length,
	);
	const worstCompromise =
		["burned", "engaged", "engaged_exfil", "warm", "cold"].find((level) =>
			reconReports.some((r) => r.answers?.compromise === level),
		) || "cold";
	const hasCasualties = reconReports.some(
		(r) => r.answers?.casualties !== "none",
	);
	const routeCleared = reconReports.some(
		(r) => r.reconType === "route" && r.answers?.routeStatus === "cleared",
	);
	const anyMismatch = reconReports.some(
		(r) => r.modifiers?.assetMismatch === true,
	);

	let reconQuality;
	if (avgScore >= 75) reconQuality = "excellent";
	else if (avgScore >= 50) reconQuality = "good";
	else if (avgScore >= 25) reconQuality = "fair";
	else reconQuality = "poor";

	let recommendedApproach = "stealth";
	if (worstCompromise === "burned") recommendedApproach = "abort";
	else if (["engaged", "engaged_exfil"].includes(worstCompromise))
		recommendedApproach = "aggressive";

	return {
		overallIntelScore: avgScore,
		reconQuality,
		reportCount: reconReports.length,
		worstCompromise,
		hasCasualties,
		isRouteCleared: routeCleared,
		anyAssetMismatch: anyMismatch,
		recommendedApproach,
	};
};

// ─── GET /api/missions ────────────────────────────────────────
// @desc  Get all missions for the authenticated user
// @access Private
exports.getMissions = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		// Return lightweight list — exclude full briefingText and reconReport answers
		// to keep the list response small. Frontend only needs these for the detail view.
		const missions = await Mission.find({ createdBy: userId })
			.select("-briefingText -reconReports.answers -reconReports.modifiers")
			.sort({ createdAt: -1 });

		res.status(200).json(missions);
	} catch (error) {
		console.error("Error fetching missions:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── GET /api/missions/:id ────────────────────────────────────
// @desc  Get a single mission with full data
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

		// Attach computed intel assessment so the frontend doesn't have to calculate it
		const intelAssessment = computeIntelAssessment(mission.reconReports);

		res.status(200).json({ mission, intelAssessment });
	} catch (error) {
		console.error("Error fetching mission:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── POST /api/missions ───────────────────────────────────────
// @desc  Create a new mission — only name is required at creation time
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

// ─── PUT /api/missions/:id ────────────────────────────────────
// @desc  Update mission fields — generator output, briefing, status, notes, province
// @access Private
exports.updateMission = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		// Whitelist updatable top-level fields — reconReports updated via own route
		const { name, status, province, biome, generator, briefingText, notes } =
			req.body;

		const patch = {};
		if (name !== undefined) patch.name = name.trim();
		if (status !== undefined) patch.status = status;
		if (province !== undefined) patch.province = province;
		if (biome !== undefined) patch.biome = biome;
		if (generator !== undefined) patch.generator = generator;
		if (briefingText !== undefined) patch.briefingText = briefingText;
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

// ─── DELETE /api/missions/:id ─────────────────────────────────
// @desc  Delete a mission
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

// ─── POST /api/missions/:id/recon ────────────────────────────
// @desc  Append a completed recon report to a mission
// @access Private
exports.addReconReport = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const { reconType, answers, modifiers } = req.body;

		if (!answers) {
			return res.status(400).json({ message: "Recon answers are required" });
		}

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{
				$push: {
					reconReports: {
						reconType: reconType || "standard",
						answers,
						modifiers: modifiers || {},
						completedAt: new Date(),
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

		// Return the newly added report and updated intel assessment
		const newReport = mission.reconReports[mission.reconReports.length - 1];
		const intelAssessment = computeIntelAssessment(mission.reconReports);

		res.status(201).json({
			message: "Recon report saved",
			report: newReport,
			intelAssessment,
			totalReports: mission.reconReports.length,
		});
	} catch (error) {
		console.error("Error saving recon report:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ─── DELETE /api/missions/:id/recon/:reportId ─────────────────
// @desc  Remove a specific recon report from a mission
// @access Private
exports.deleteReconReport = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			{ $pull: { reconReports: { _id: req.params.reportId } } },
			{ new: true },
		);

		if (!mission) {
			return res
				.status(404)
				.json({ message: "Mission not found or unauthorized" });
		}

		const intelAssessment = computeIntelAssessment(mission.reconReports);

		res.status(200).json({
			message: "Recon report deleted",
			intelAssessment,
			totalReports: mission.reconReports.length,
		});
	} catch (error) {
		console.error("Error deleting recon report:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ─── GET /api/missions/:id/intel ─────────────────────────────
// @desc  Get computed intel assessment for a mission
//        Used by the AI briefing route to build its prompt context
// @access Private
exports.getIntelAssessment = async (req, res) => {
	try {
		if (!req.userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const mission = await Mission.findOne(
			{ _id: req.params.id, createdBy: req.userId },
			"reconReports province biome name status",
		);

		if (!mission) {
			return res.status(404).json({ message: "Mission not found" });
		}

		const intelAssessment = computeIntelAssessment(mission.reconReports);

		res.status(200).json({
			mission: {
				_id: mission._id,
				name: mission.name,
				province: mission.province,
				biome: mission.biome,
				status: mission.status,
			},
			intelAssessment,
		});
	} catch (error) {
		console.error("Error fetching intel assessment:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// Export helper for use in AI briefing controller
exports.computeIntelAssessment = computeIntelAssessment;
