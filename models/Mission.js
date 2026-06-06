const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Generator Output ─────────────────────────────────────────────────────────

const GeneratorSchema = new Schema(
	{
		generationMode: {
			type: String,
			enum: ["random", "ops", "ai"], // ← added "ai"
			default: "random",
		},
		selectedLocations: { type: [Schema.Types.Mixed], default: [] },
		mapBounds: { type: Schema.Types.Mixed },
		imgURL: { type: String, default: "" },
		missionType: { type: String, default: "" },
		infilPoint: { type: Schema.Types.Mixed, default: null },
		exfilPoint: { type: Schema.Types.Mixed, default: null },
		rallyPoint: { type: Schema.Types.Mixed, default: null },
		infilMethod: { type: String, default: "" },
		exfilMethod: { type: String, default: "" },
		approachVector: { type: String, default: "" },
	},
	{ _id: false },
);

// ─── Generator Snapshot ───────────────────────────────────────────────────────

const GeneratorSnapshotSchema = new Schema(
	{
		infilPoint: { type: Schema.Types.Mixed, default: null },
		exfilPoint: { type: Schema.Types.Mixed, default: null },
		rallyPoint: { type: Schema.Types.Mixed, default: null },
		infilMethod: { type: String, default: "" },
		exfilMethod: { type: String, default: "" },
	},
	{ _id: false },
);

// ─── Phase ────────────────────────────────────────────────────────────────────

const PhaseSchema = new Schema(
	{
		phaseNumber: { type: Number, required: true },
		province: { type: String, default: "" },
		missionType: { type: String, default: "" },
		objectives: { type: [String], default: [] },
		outcome: {
			type: String,
			enum: [
				// generic
				"clean", "compromised", "heavy", "heavy_contact", "partial", "aborted",
				"target_not_present",
				// ambush / convoy
				"no_show", "overrun", "contact", "route_denied",
				// HVT / snatch
				"hot_exfil", "hvt_escaped", "hvt_kia", "unconfirmed", "target_fled",
				// sabotage / demo
				"charges_lost", "collateral",
				// SR / recon
				"nothing", "extended", "cut_short",
				// BDA
				"confirmed", "intact", "denied", "secondary",
				// CT hostage / recovery
				"hostage_kia", "under_fire", "critical", "personnel_kia",
				// overwatch / support
				"engaged", "displaced", "fires_called",
			],
			required: true,
		},
		complications: {
			type: [String],
			enum: [
				"none",
				"qrf_responded",
				"isr_offline",
				"crosscom_lost",
				"exfil_compromised",
				"civilian_contact",
				"intel_recovered",
				"target_not_found",
				"asset_lost",
			],
			default: [],
		},
		casualties: {
			type: String,
			enum: ["none", "injured", "kia", "multiple_wia", "missing"],
			required: true,
		},
		casualtyNote: { type: String, default: "", maxlength: 150 },
		intelDeveloped: {
			type: [String],
			enum: [
				"nothing_new",
				"patrol_timing",
				"enemy_strength",
				"facility_layout",
				"hvt_location",
				"hvt_confirmed",
				"supply_route",
				"contact_activated",
				"comms_net",
				"weapons_cache",
				"command_element",
				"civilian_network",
				"air_defense",
				"vehicle_count",
				"sigint",
				"tunnels_cache",
				"network_structure",
				"safe_house",
				"facilitator",
				"foreign_link",
				"propaganda",
				"comms_devices",
				"position_mapped",
				"route_intel",
				"cache_sighted",
			],
			default: [],
		},
		notes: { type: String, default: "", maxlength: 150 },
		squadUsed: { type: String, default: "" },
		infilMethodUsed: { type: String, default: "" },
		generatorSnapshot: { type: GeneratorSnapshotSchema, default: () => ({}) },
		createdAt: { type: Date, default: Date.now },
	},
	{ timestamps: false },
);

// ─── Mission ──────────────────────────────────────────────────────────────────

const MissionSchema = new Schema(
	{
		createdBy: { type: String, required: true, index: true },
		name: { type: String, required: true, trim: true, maxlength: 80 },
		status: {
			type: String,
			enum: ["planning", "active", "complete"],
			default: "planning",
		},
		province: { type: String, default: "" },
		biome: { type: String, default: "" },
		generator: { type: GeneratorSchema, default: () => ({}) },
		briefingText: { type: String, default: "" },
		phases: { type: [PhaseSchema], default: [] },
		aar: { type: String, default: null },
		notes: { type: String, default: "", maxlength: 2000 },

		// ── AI advisory fields ─────────────────────────────────────────────────
		// Only populated when mission is generated via AI Ops mode (AIAdvisor).
		aiGenerated: { type: Boolean, default: false },
		opType: { type: String, default: "" },
		advisory: { type: Schema.Types.Mixed, default: null },
	},
	{
		timestamps: true,
	},
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

MissionSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Mission", MissionSchema);
