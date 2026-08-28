const mongoose = require("mongoose");

// A membership record — operator reference plus the already-working
// per-team "selected class" (previously a separate operatorRoles Map,
// now embedded so slot position (the array index) and class travel
// together and invariants can be checked against one structure).
const teamMemberSchema = new mongoose.Schema(
	{
		operatorId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Operator",
			required: true,
		},
		class: { type: String, default: null },
	},
	{ _id: false },
);

async function validateTeamMembers(TeamModel, { _id, createdBy, activeSlots, reserves }) {
	const slots = activeSlots ?? [];
	const res = reserves ?? [];

	if (slots.length !== 4) {
		throw new Error("activeSlots must have exactly 4 entries");
	}

	const seen = new Set();
	for (const member of [...slots.filter(Boolean), ...res]) {
		const id = String(member.operatorId);
		if (seen.has(id)) {
			throw new Error(`Operator ${id} appears more than once on this team`);
		}
		seen.add(id);
	}

	if (seen.size === 0) return;

	const ids = [...seen];
	const conflict = await TeamModel.findOne({
		...(_id ? { _id: { $ne: _id } } : {}),
		createdBy,
		$or: [
			{ "activeSlots.operatorId": { $in: ids } },
			{ "reserves.operatorId": { $in: ids } },
		],
	}).lean();

	if (conflict) {
		throw new Error(
			`One or more operators are already assigned to another team (${conflict.name})`,
		);
	}
}

const teamSchema = new mongoose.Schema({
	//Cognito user
	createdBy: { type: String, required: true },
	name: { type: String, required: true },
	AO: { type: String, default: null },
	// Dense, fixed length 4 — index is the slot number (index 0 = slot 1).
	// An empty slot is `null` at that index, never a shortened array.
	activeSlots: {
		type: [teamMemberSchema],
		default: () => [null, null, null, null],
		validate: {
			validator: (v) => v.length === 4,
			message: "activeSlots must have exactly 4 entries",
		},
	},
	// Ordered, unbounded — index 0 is next man up. Reserve entries never
	// carry a slot number in any representation.
	reserves: { type: [teamMemberSchema], default: [] },
	assets: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Vehicle",
		},
	],
	attachedTeams: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Team",
		},
	],
	// The operator designated as team lead (string ObjectId)
	leadId: {
		type: String,
		default: null,
	},
	// 1 = legacy operators[]/operatorRoles shape (or unset). 2 = activeSlots/reserves.
	schemaVersion: { type: Number, default: 2 },
});

// Invariants enforced at the model layer so they hold regardless of which
// endpoint writes the document — including the generic PUT /:id, which
// uses findOneAndUpdate and therefore skips document ("save") middleware.
teamSchema.pre("save", async function (next) {
	try {
		await validateTeamMembers(this.constructor, this);
		next();
	} catch (err) {
		next(err);
	}
});

teamSchema.pre("findOneAndUpdate", async function (next) {
	try {
		const update = this.getUpdate() || {};
		const set = update.$set || update;
		const touchesMembers = "activeSlots" in set || "reserves" in set;
		if (!touchesMembers) return next();

		const current = await this.model.findOne(this.getQuery()).lean();
		if (!current) return next();

		await validateTeamMembers(this.model, {
			_id: current._id,
			createdBy: current.createdBy,
			activeSlots: set.activeSlots ?? current.activeSlots,
			reserves: set.reserves ?? current.reserves,
		});
		next();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model("Team", teamSchema);
