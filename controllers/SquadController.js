const Squad = require("../models/Squad");
const Operator = require("../models/Operator");

// matches your authenticate middleware: req.userId = payload.sub
const userFilter = (req) => ({ createdBy: req.userId });

// ── GET /api/squads ───────────────────────────────────────────
const getSquads = async (req, res) => {
	try {
		const [squads, enablers, aviation] = await Promise.all([
			Squad.find(userFilter(req)).populate("operators").sort({ createdAt: -1 }),
			Operator.find({ createdBy: req.userId, support: true }),
			Operator.find({ createdBy: req.userId, aviator: true }),
		]);
		res.json({ squads, enablers, aviation });
	} catch (err) {
		console.error("getSquads:", err);
		res.status(500).json({ message: "Failed to fetch squads." });
	}
};

// ── GET /api/squads/:id ───────────────────────────────────────
const getSquadById = async (req, res) => {
	try {
		const squad = await Squad.findOne({
			_id: req.params.id,
			...userFilter(req),
		}).populate("operators");

		if (!squad) return res.status(404).json({ message: "Squad not found." });
		res.json(squad);
	} catch (err) {
		console.error("getSquadById:", err);
		res.status(500).json({ message: "Failed to fetch squad." });
	}
};

// ── POST /api/squads ──────────────────────────────────────────
const createSquad = async (req, res) => {
	try {
		const { name, operators } = req.body;

		if (!name?.trim())
			return res.status(400).json({ message: "Squad name is required." });

		const squad = await Squad.create({
			createdBy: req.userId,
			name: name.trim(),
			operators: operators || [],
		});

		const populated = await squad.populate("operators");
		res.status(201).json(populated);
	} catch (err) {
		console.error("createSquad:", err);
		res.status(500).json({ message: "Failed to create squad." });
	}
};

// ── PUT /api/squads/:id ───────────────────────────────────────
const updateSquad = async (req, res) => {
	try {
		const { name, operators, isActive } = req.body;

		const squad = await Squad.findOneAndUpdate(
			{ _id: req.params.id, ...userFilter(req) },
			{
				...(name !== undefined && { name: name.trim() }),
				...(operators !== undefined && { operators }),
				...(isActive !== undefined && { isActive }),
			},
			{ new: true, runValidators: true },
		).populate("operators");

		if (!squad) return res.status(404).json({ message: "Squad not found." });
		res.json(squad);
	} catch (err) {
		console.error("updateSquad:", err);
		res.status(500).json({ message: "Failed to update squad." });
	}
};

// ── PATCH /api/squads/:id/operators ──────────────────────────
const updateOperator = async (req, res) => {
	try {
		const { action, operatorId } = req.body;

		if (!["add", "remove"].includes(action))
			return res
				.status(400)
				.json({ message: "action must be 'add' or 'remove'." });

		const squad = await Squad.findOne({
			_id: req.params.id,
			...userFilter(req),
		});
		if (!squad) return res.status(404).json({ message: "Squad not found." });

		if (action === "add") {
			if (!squad.operators.map(String).includes(operatorId))
				squad.operators.push(operatorId);
		} else {
			squad.operators = squad.operators.filter(
				(id) => id.toString() !== operatorId,
			);
		}

		await squad.save();
		const populated = await squad.populate("operators");
		res.json(populated);
	} catch (err) {
		console.error("updateOperator:", err);
		res.status(500).json({ message: "Failed to update squad operator." });
	}
};

// ── PATCH /api/squads/active ──────────────────────────────────
const setActiveSquad = async (req, res) => {
	try {
		const { squadId } = req.body;

		await Squad.updateMany(userFilter(req), { isActive: false });

		if (squadId) {
			await Squad.findOneAndUpdate(
				{ _id: squadId, ...userFilter(req) },
				{ isActive: true },
			);
		}

		const squads = await Squad.find(userFilter(req))
			.populate("operators")
			.sort({ createdAt: -1 });

		res.json(squads);
	} catch (err) {
		console.error("setActiveSquad:", err);
		res.status(500).json({ message: "Failed to set active squad." });
	}
};

// ── DELETE /api/squads/:id ────────────────────────────────────
const deleteSquad = async (req, res) => {
	try {
		const squad = await Squad.findOneAndDelete({
			_id: req.params.id,
			...userFilter(req),
		});
		if (!squad) return res.status(404).json({ message: "Squad not found." });
		res.json({ message: "Squad deleted.", id: req.params.id });
	} catch (err) {
		console.error("deleteSquad:", err);
		res.status(500).json({ message: "Failed to delete squad." });
	}
};

module.exports = {
	getSquads,
	getSquadById,
	createSquad,
	updateSquad,
	updateOperator,
	setActiveSquad,
	deleteSquad,
};
