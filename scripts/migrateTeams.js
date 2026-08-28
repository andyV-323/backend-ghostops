#!/usr/bin/env node
// scripts/migrateTeams.js
//
// One-time migration: legacy Team shape (operators: [ObjectId],
// operatorRoles: Map<operatorId, className>) -> new shape
// (activeSlots: [TeamMember|null] x4, reserves: [TeamMember]).
//
// Usage:
//   node scripts/migrateTeams.js --dry-run [--createdBy=<cognitoSub>]
//   node scripts/migrateTeams.js [--createdBy=<cognitoSub>]
//
// Idempotent: teams with schemaVersion >= 2 are skipped on every run, so
// re-running after a real migration (or a partial one) is always safe.
//
// Reads via the raw native-driver collection (Team.collection), not the
// Mongoose model, so legacy `operators`/`operatorRoles` fields are visible
// regardless of what the *current* schema declares, and so Mongoose's
// schema defaults (e.g. schemaVersion's default of 2) can't mask which
// documents are genuinely unmigrated in storage.

require("dotenv").config();
const mongoose = require("mongoose");
const Team = require("../models/Team");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const createdByArg = args.find((a) => a.startsWith("--createdBy="));
const SCOPE_CREATED_BY = createdByArg ? createdByArg.split("=")[1] : null;

const normalizeName = (name) => (name || "").trim().toLowerCase();

// A "pair" is base team X and secondary team "X 2" (case/whitespace
// insensitive), scoped to the same createdBy — never merged across users.
function findPairs(teams) {
	const byKey = new Map();
	for (const t of teams) byKey.set(`${t.createdBy}::${normalizeName(t.name)}`, t);

	const pairs = [];
	const paired = new Set();
	for (const t of teams) {
		if (paired.has(String(t._id))) continue;
		const secondary = byKey.get(`${t.createdBy}::${normalizeName(t.name)} 2`);
		if (secondary && !paired.has(String(secondary._id))) {
			pairs.push({ base: t, secondary });
			paired.add(String(t._id));
			paired.add(String(secondary._id));
		}
	}
	return { pairs, paired };
}

const roleFor = (rawTeam, operatorId) => (rawTeam.operatorRoles || {})[String(operatorId)] ?? null;

const toMembers = (rawTeam) =>
	(rawTeam.operators || []).map((opId) => ({ operatorId: opId, class: roleFor(rawTeam, opId) }));

function splitIntoSlotsAndReserves(members) {
	const activeSlots = [null, null, null, null];
	const reserves = [];
	members.forEach((m, i) => (i < 4 ? (activeSlots[i] = m) : reserves.push(m)));
	return { activeSlots, reserves };
}

function memberCount({ activeSlots, reserves }) {
	return activeSlots.filter(Boolean).length + reserves.length;
}

async function run() {
	await mongoose.connect(process.env.MONGO_URI);
	console.log(
		`Connected. Mode: ${DRY_RUN ? "DRY RUN" : "LIVE WRITE"}` +
			(SCOPE_CREATED_BY ? `, scoped to createdBy=${SCOPE_CREATED_BY}` : ""),
	);

	const query = { $or: [{ schemaVersion: { $exists: false } }, { schemaVersion: { $lt: 2 } }] };
	if (SCOPE_CREATED_BY) query.createdBy = SCOPE_CREATED_BY;

	const rawTeams = await Team.collection.find(query).toArray();
	console.log(`Found ${rawTeams.length} unmigrated team(s).`);

	// Pre-flight: the old schema never enforced "an operator is on at most
	// one team," so legacy data can already have an operator double-booked
	// across two teams (including one that's already been migrated in an
	// earlier run). Surface that now rather than discovering it one write
	// failure at a time.
	const alreadyMigrated = await Team.collection
		.find({ schemaVersion: { $gte: 2 }, ...(SCOPE_CREATED_BY ? { createdBy: SCOPE_CREATED_BY } : {}) })
		.toArray();
	const byOperator = new Map(); // `${createdBy}::${operatorId}` -> [teamName]
	for (const t of rawTeams) {
		for (const opId of t.operators || []) {
			const key = `${t.createdBy}::${opId}`;
			byOperator.set(key, [...(byOperator.get(key) || []), t.name]);
		}
	}
	for (const t of alreadyMigrated) {
		for (const m of [...(t.activeSlots || []).filter(Boolean), ...(t.reserves || [])]) {
			const key = `${t.createdBy}::${m.operatorId}`;
			byOperator.set(key, [...(byOperator.get(key) || []), t.name]);
		}
	}
	const preExistingDupes = [...byOperator.entries()].filter(([, names]) => names.length > 1);
	if (preExistingDupes.length > 0) {
		console.log(`\n⚠ ${preExistingDupes.length} operator(s) already on more than one team before this run (pre-existing data issue, not caused by migration):`);
		for (const [key, names] of preExistingDupes) {
			const [createdBy, opId] = key.split("::");
			console.log(`  operator ${opId} (createdBy=${createdBy}): ${names.join(", ")}`);
		}
	}

	if (rawTeams.length === 0) {
		await mongoose.disconnect();
		return;
	}

	const { pairs, paired } = findPairs(rawTeams);
	let unpaired = rawTeams.filter((t) => !paired.has(String(t._id)));

	// Classify pairs: AO conflict -> fall through to solo migration for both.
	const mergeable = [];
	const conflicts = [];
	for (const pair of pairs) {
		const baseAO = pair.base.AO ?? null;
		const secondaryAO = pair.secondary.AO ?? null;
		const aoConflict = baseAO !== null && secondaryAO !== null && baseAO !== secondaryAO;
		if (aoConflict) {
			conflicts.push({ ...pair, baseAO, secondaryAO });
			unpaired = [...unpaired, pair.base, pair.secondary];
		} else {
			mergeable.push({ ...pair, ao: baseAO ?? secondaryAO ?? null });
		}
	}

	console.log(`\n--- Pair detection ---`);
	console.log(`${mergeable.length} pair(s) will merge:`);
	for (const p of mergeable) console.log(`  "${p.base.name}" (${p.base._id})  <-  "${p.secondary.name}" (${p.secondary._id})  AO=${p.ao ?? "(none)"}`);
	console.log(`${conflicts.length} pair(s) skipped on AO conflict:`);
	for (const c of conflicts) console.log(`  ⚠ "${c.base.name}" (AO=${c.baseAO}) vs "${c.secondary.name}" (AO=${c.secondaryAO}) — logged, not merged`);
	console.log(`${unpaired.length} team(s) migrated solo (unpaired, or conflicted pairs falling through):`);
	for (const t of unpaired) console.log(`  "${t.name}" (${t._id})`);

	// Build every write with a before/after count assertion.
	const results = [];
	let totalBefore = 0;
	let totalAfter = 0;

	for (const p of mergeable) {
		const before = (p.base.operators?.length || 0) + (p.secondary.operators?.length || 0);
		const baseMembers = toMembers(p.base);
		const { activeSlots, reserves: baseReserves } = splitIntoSlotsAndReserves(baseMembers);
		const reserves = [...baseReserves, ...toMembers(p.secondary)];
		const after = memberCount({ activeSlots, reserves });
		if (before !== after) {
			throw new Error(`Count mismatch merging "${p.base.name}"/"${p.secondary.name}": before=${before} after=${after}`);
		}
		totalBefore += before;
		totalAfter += after;
		results.push({ type: "merge", base: p.base, secondary: p.secondary, activeSlots, reserves, before, after });
	}

	for (const t of unpaired) {
		const { activeSlots, reserves } = splitIntoSlotsAndReserves(toMembers(t));
		const before = t.operators?.length || 0;
		const after = memberCount({ activeSlots, reserves });
		if (before !== after) {
			throw new Error(`Count mismatch on "${t.name}": before=${before} after=${after}`);
		}
		totalBefore += before;
		totalAfter += after;
		results.push({ type: "solo", team: t, activeSlots, reserves, before, after });
	}

	console.log(`\n--- Per-team counts ---`);
	for (const r of results) {
		const label = r.type === "merge" ? `"${r.base.name}" + "${r.secondary.name}"` : `"${r.team.name}"`;
		console.log(`  ${label}: before=${r.before} after=${r.after} ${r.before === r.after ? "OK" : "MISMATCH"}`);
	}
	console.log(`\nTOTAL: before=${totalBefore} after=${totalAfter} ${totalBefore === totalAfter ? "OK" : "MISMATCH"}`);
	if (totalBefore !== totalAfter) {
		throw new Error(`Global operator count mismatch: before=${totalBefore} after=${totalAfter}`);
	}

	if (DRY_RUN) {
		console.log(`\nDRY RUN — no writes performed. ${results.length} team(s) would be written, ${conflicts.length} conflict(s) need manual review.`);
		await mongoose.disconnect();
		return;
	}

	// Writes are best-effort per team: a pre-existing data bug (an operator
	// already illegitimately on two teams before this migration ever ran,
	// which the old schema never caught) can make one team's write fail the
	// cross-team invariant. That's a real data problem to surface, not a
	// reason to abort every team after it — skip and log, same as an AO
	// conflict, and keep going.
	let written = 0;
	const writeFailures = [];
	for (const r of results) {
		try {
			if (r.type === "merge") {
				const baseDoc = await Team.findById(r.base._id);
				baseDoc.activeSlots = r.activeSlots;
				baseDoc.reserves = r.reserves;
				baseDoc.schemaVersion = 2;
				await baseDoc.save();
				await Team.findByIdAndDelete(r.secondary._id);
				console.log(`Wrote merge: "${r.base.name}" absorbed "${r.secondary.name}"`);
			} else {
				const doc = await Team.findById(r.team._id);
				doc.activeSlots = r.activeSlots;
				doc.reserves = r.reserves;
				doc.schemaVersion = 2;
				await doc.save();
				console.log(`Wrote solo migration: "${r.team.name}"`);
			}
			written++;
		} catch (err) {
			const label = r.type === "merge" ? `"${r.base.name}" + "${r.secondary.name}"` : `"${r.team.name}"`;
			console.log(`⚠ SKIPPED (write failed) ${label}: ${err.message}`);
			writeFailures.push({ label, message: err.message });
		}
	}

	console.log(`\nDone. ${written}/${results.length} team(s) written.`);
	if (conflicts.length > 0) {
		console.log(`\n${conflicts.length} AO conflict(s) require manual review before their teams can be paired:`);
		for (const c of conflicts) console.log(`  "${c.base.name}" (AO=${c.baseAO}) vs "${c.secondary.name}" (AO=${c.secondaryAO})`);
	}
	if (writeFailures.length > 0) {
		console.log(`\n${writeFailures.length} team(s) left unmigrated (pre-existing data conflict, needs manual review):`);
		for (const f of writeFailures) console.log(`  ${f.label}: ${f.message}`);
	}

	await mongoose.disconnect();
}

run().catch((err) => {
	console.error("Migration failed:", err);
	process.exit(1);
});
