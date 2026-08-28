const Team = require("../models/Team");
const Operator = require("../models/Operator");
const mongoose = require("mongoose");

const MEMBER_POPULATE = [
	{ path: "activeSlots.operatorId" },
	{ path: "reserves.operatorId" },
];

const ATTACHED_TEAM_POPULATE = {
	path: "attachedTeams",
	populate: [...MEMBER_POPULATE, { path: "assets" }],
};

function sameOperator(member, operatorId) {
	return member && String(member.operatorId) === String(operatorId);
}

// Removes operatorId from every OTHER team the same user owns (there should
// be at most one, per the model's cross-team invariant), returning the
// membership record (operatorId + class) it was holding, if any, so the
// caller can carry the selected class over to its new team.
async function pullFromOtherTeams(userId, excludeTeamId, operatorId) {
	const others = await Team.find({
		createdBy: userId,
		_id: { $ne: excludeTeamId },
		$or: [{ "activeSlots.operatorId": operatorId }, { "reserves.operatorId": operatorId }],
	});

	let carried = null;
	for (const other of others) {
		const slotIdx = other.activeSlots.findIndex((m) => sameOperator(m, operatorId));
		if (slotIdx >= 0) {
			carried = carried || { operatorId, class: other.activeSlots[slotIdx].class };
			other.activeSlots[slotIdx] = null;
		}
		const reserveIdx = other.reserves.findIndex((m) => sameOperator(m, operatorId));
		if (reserveIdx >= 0) {
			carried = carried || { operatorId, class: other.reserves[reserveIdx].class };
			other.reserves.splice(reserveIdx, 1);
		}
		other.markModified("activeSlots");
		other.markModified("reserves");
		await other.save();
	}
	return carried;
}

async function populateTeam(team) {
	return team.populate(MEMBER_POPULATE);
}

/// POST a new team
exports.createTeam = async (req, res) => {
	try {
		console.log("Incoming CREATE Team Request:", req.body);

		// Validate required fields
		const { createdBy, name, operators, assets } = req.body;

		if (!createdBy || !name) {
			return res
				.status(400)
				.json({ error: "Missing required fields: createdBy, name" });
		}

		//valid MongoDB ObjectIds
		const validOperatorIds = (Array.isArray(operators) ? operators : []).filter((opId) =>
			mongoose.Types.ObjectId.isValid(opId),
		);
		const validAssetIds = (Array.isArray(assets) ? assets : []).filter(
			(assetId) => mongoose.Types.ObjectId.isValid(assetId),
		);

		// First up-to-4 operators fill active slots (dense, null-padded);
		// the rest — if any were passed — land in reserves.
		const activeSlots = [null, null, null, null];
		const reserves = [];
		validOperatorIds.forEach((opId, i) => {
			const member = { operatorId: opId, class: null };
			if (i < 4) activeSlots[i] = member;
			else reserves.push(member);
		});

		const newTeam = new Team({
			createdBy,
			name,
			activeSlots,
			reserves,
			assets: validAssetIds,
		});

		await newTeam.save();
		await populateTeam(newTeam);

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
		const teams = await Team.find({ createdBy: userId })
			.populate(MEMBER_POPULATE)
			.populate("assets")
			.populate(ATTACHED_TEAM_POPULATE);

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
		})
			.populate(MEMBER_POPULATE)
			.populate("assets")
			.populate(ATTACHED_TEAM_POPULATE);
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
			{ new: true, runValidators: true },
		).populate(MEMBER_POPULATE);

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

// ATTACH a team to another team (adds to attachedTeams array)
exports.attachTeam = async (req, res) => {
	try {
		const userId = req.userId;
		const mainTeamId = req.params.id;
		const { teamId } = req.body;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
		if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
			return res.status(400).json({ error: "Invalid teamId" });
		}
		if (mainTeamId === teamId) {
			return res.status(400).json({ error: "A team cannot be attached to itself" });
		}

		const team = await Team.findOneAndUpdate(
			{ _id: mainTeamId, createdBy: userId },
			{ $addToSet: { attachedTeams: teamId } },
			{ new: true },
		);

		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		res.status(200).json({ message: "Team attached successfully", team });
	} catch (error) {
		console.error("Error attaching team:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// DETACH a team from another team (removes from attachedTeams array)
exports.detachTeam = async (req, res) => {
	try {
		const userId = req.userId;
		const { id: mainTeamId, attachedTeamId } = req.params;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });

		const team = await Team.findOneAndUpdate(
			{ _id: mainTeamId, createdBy: userId },
			{ $pull: { attachedTeams: attachedTeamId } },
			{ new: true },
		);

		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		res.status(200).json({ message: "Team detached successfully", team });
	} catch (error) {
		console.error("Error detaching team:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// REMOVE an operator from all teams (active slots + reserves) belonging to
// whichever user(s) currently have them assigned.
exports.removeOperatorFromTeams = async (req, res) => {
	try {
		const { operatorId } = req.params;
		if (!operatorId) {
			return res.status(400).json({ error: "Missing operatorId" });
		}

		const teams = await Team.find({
			$or: [{ "activeSlots.operatorId": operatorId }, { "reserves.operatorId": operatorId }],
		});

		for (const team of teams) {
			team.activeSlots = team.activeSlots.map((m) => (sameOperator(m, operatorId) ? null : m));
			team.reserves = team.reserves.filter((m) => !sameOperator(m, operatorId));
			await team.save();
		}

		res.status(200).json({
			message: "Operator removed from all teams",
			result: { matchedCount: teams.length, modifiedCount: teams.length },
		});
	} catch (error) {
		console.error("Error removing operator from teams:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// ── PATCH /:id/assign-slot ──────────────────────────────────────────
// body: { operatorId, slot }  slot: 1-4, or null to send to end of reserves.
// Moves the operator to that slot within THIS team; if they weren't
// already on this team, pulls them off whichever other team they were on
// first (carrying their selected class along). If the target slot is
// already occupied, swaps: the occupant takes the position the incoming
// operator vacated (their old slot/reserve spot on this team), or — if the
// incoming operator had no position on this team to swap into — the
// occupant is bumped to the front of reserves.
exports.assignSlot = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;
		const { operatorId, slot } = req.body;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
		if (!operatorId) return res.status(400).json({ error: "Missing operatorId" });
		if (slot !== null && ![1, 2, 3, 4].includes(slot)) {
			return res.status(400).json({ error: "slot must be 1, 2, 3, 4, or null" });
		}

		const team = await Team.findOne({ _id: teamId, createdBy: userId });
		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		const slotIdx = team.activeSlots.findIndex((m) => sameOperator(m, operatorId));
		const reserveIdx = team.reserves.findIndex((m) => sameOperator(m, operatorId));

		let member;
		if (slotIdx >= 0) {
			member = team.activeSlots[slotIdx];
			team.activeSlots[slotIdx] = null;
		} else if (reserveIdx >= 0) {
			member = team.reserves[reserveIdx];
			team.reserves.splice(reserveIdx, 1);
		} else {
			member = (await pullFromOtherTeams(userId, teamId, operatorId)) || { operatorId, class: null };
		}

		if (slot === null) {
			team.reserves.push(member);
		} else {
			const idx = slot - 1;
			const occupant = team.activeSlots[idx];
			if (occupant && String(occupant.operatorId) !== String(operatorId)) {
				if (slotIdx >= 0) team.activeSlots[slotIdx] = occupant;
				else if (reserveIdx >= 0) team.reserves.splice(reserveIdx, 0, occupant);
				else team.reserves.unshift(occupant);
			}
			team.activeSlots[idx] = member;
		}

		team.markModified("activeSlots");
		team.markModified("reserves");
		await team.save();
		await populateTeam(team);

		res.status(200).json({ message: "Slot assigned", team });
	} catch (error) {
		console.error("Error assigning slot:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ── PATCH /:id/reorder-reserve ──────────────────────────────────────
// body: { operatorId, direction }  direction: "up" | "down"
exports.reorderReserve = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;
		const { operatorId, direction } = req.body;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
		if (!["up", "down"].includes(direction)) {
			return res.status(400).json({ error: "direction must be 'up' or 'down'" });
		}

		const team = await Team.findOne({ _id: teamId, createdBy: userId });
		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		const idx = team.reserves.findIndex((m) => sameOperator(m, operatorId));
		if (idx === -1) return res.status(400).json({ error: "Operator is not in reserves for this team" });

		const target = direction === "up" ? idx - 1 : idx + 1;
		if (target >= 0 && target < team.reserves.length) {
			[team.reserves[idx], team.reserves[target]] = [team.reserves[target], team.reserves[idx]];
			team.markModified("reserves");
			await team.save();
		}
		await populateTeam(team);

		res.status(200).json({ message: "Reserve reordered", team });
	} catch (error) {
		console.error("Error reordering reserve:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ── PATCH /:id/promote-reserve ──────────────────────────────────────
// body: { operatorId, slot }  slot: 1-4, required. If occupied, the
// occupant is bumped to the front of reserves.
exports.promoteReserve = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;
		const { operatorId, slot } = req.body;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
		if (![1, 2, 3, 4].includes(slot)) {
			return res.status(400).json({ error: "slot must be 1, 2, 3, or 4" });
		}

		const team = await Team.findOne({ _id: teamId, createdBy: userId });
		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		const idx = team.reserves.findIndex((m) => sameOperator(m, operatorId));
		if (idx === -1) return res.status(400).json({ error: "Operator is not in reserves for this team" });

		const [member] = team.reserves.splice(idx, 1);
		const slotIdx = slot - 1;
		const occupant = team.activeSlots[slotIdx];
		if (occupant) team.reserves.unshift(occupant);
		team.activeSlots[slotIdx] = member;

		team.markModified("activeSlots");
		team.markModified("reserves");
		await team.save();
		await populateTeam(team);

		res.status(200).json({ message: "Reserve promoted", team });
	} catch (error) {
		console.error("Error promoting reserve:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ── PATCH /:id/add ───────────────────────────────────────────────────
// body: { operatorId, classUsed }
// Fills the lowest-numbered empty active slot; if all four are full,
// appends to reserves. If the operator is on another team, removes them
// there first. Response includes `destination` so the caller can label the
// action ("Added to Slot 2" vs "Added to Reserves") from the result.
exports.addToTeam = async (req, res) => {
	try {
		const userId = req.userId;
		const teamId = req.params.id;
		const { operatorId, classUsed } = req.body;

		if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
		if (!operatorId) return res.status(400).json({ error: "Missing operatorId" });

		const team = await Team.findOne({ _id: teamId, createdBy: userId });
		if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

		const existingSlotIdx = team.activeSlots.findIndex((m) => sameOperator(m, operatorId));
		const existingReserveIdx = team.reserves.findIndex((m) => sameOperator(m, operatorId));

		let destination;
		if (existingSlotIdx >= 0) {
			if (classUsed !== undefined) team.activeSlots[existingSlotIdx].class = classUsed;
			destination = { type: "slot", slot: existingSlotIdx + 1 };
		} else if (existingReserveIdx >= 0) {
			if (classUsed !== undefined) team.reserves[existingReserveIdx].class = classUsed;
			destination = { type: "reserve" };
		} else {
			const carried = await pullFromOtherTeams(userId, teamId, operatorId);
			const member = { operatorId, class: classUsed ?? carried?.class ?? null };
			const emptyIdx = team.activeSlots.findIndex((m) => !m);
			if (emptyIdx >= 0) {
				team.activeSlots[emptyIdx] = member;
				destination = { type: "slot", slot: emptyIdx + 1 };
			} else {
				team.reserves.push(member);
				destination = { type: "reserve" };
			}
		}

		team.markModified("activeSlots");
		team.markModified("reserves");
		await team.save();
		await populateTeam(team);

		res.status(200).json({ message: "Operator added to team", team, destination });
	} catch (error) {
		console.error("Error adding operator to team:", error.message);
		res.status(400).json({ error: error.message });
	}
};
