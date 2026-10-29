// scripts/backfillCasualties.js — one-time backfill for operators whose
// status was already Injured/KIA before the Casualties feature's status-route
// hook existed. That hook only fires on *new* PUT /:id/status transitions, so
// pre-existing mismatched data (operator already Injured/KIA but still
// sitting in activeSlots/reserves) needs this run once to catch up.
//
// Usage: node scripts/backfillCasualties.js [--dry-run]
require("dotenv").config();
const mongoose = require("mongoose");
const Operator = require("../models/Operator");
const Team = require("../models/Team");

const dryRun = process.argv.includes("--dry-run");

(async () => {
	await mongoose.connect(process.env.MONGO_URI);

	const casualtyOperators = await Operator.find({ status: { $in: ["Injured", "KIA"] } }).lean();
	const casualtyIds = new Set(casualtyOperators.map((op) => String(op._id)));
	const callSignById = new Map(casualtyOperators.map((op) => [String(op._id), op.callSign]));

	const teams = await Team.find({});
	let movedCount = 0;

	for (const team of teams) {
		const moved = [];
		let changed = false;

		team.activeSlots = (team.activeSlots || [null, null, null, null]).map((m) => {
			if (m && casualtyIds.has(String(m.operatorId))) {
				moved.push(m);
				changed = true;
				return null;
			}
			return m;
		});

		const keptReserves = [];
		for (const m of team.reserves || []) {
			if (casualtyIds.has(String(m.operatorId))) {
				moved.push(m);
				changed = true;
			} else {
				keptReserves.push(m);
			}
		}
		team.reserves = keptReserves;

		if (!changed) continue;

		const existingCasualtyIds = new Set((team.casualties || []).map((m) => String(m.operatorId)));
		const newCasualties = moved.filter((m) => !existingCasualtyIds.has(String(m.operatorId)));
		team.casualties = [...(team.casualties || []), ...newCasualties];

		for (const m of moved) {
			const label = callSignById.get(String(m.operatorId)) || m.operatorId;
			console.log(`${dryRun ? "[dry-run] would move" : "moving"} ${label} -> "${team.name}" Casualties`);
			movedCount++;
		}

		if (!dryRun) await team.save();
	}

	console.log(`\n${dryRun ? "Would move" : "Moved"} ${movedCount} operator(s) into Casualties.`);
	await mongoose.disconnect();
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
