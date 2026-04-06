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

// ─── Campaign Phase ───────────────────────────────────────────────────────────
// AI-planned phase stubs — generated upfront by generateCampaign().
// One entry per phase in the operation. Player files phase reports
// against these, advancing status as the campaign progresses.

const CampaignPhaseSchema = new Schema(
	{
		phaseIndex: { type: Number, required: true },

		// AI-generated narrative fields
		label: { type: String, default: "" }, // e.g. "Cold Canvas"
		objective: { type: String, default: "" }, // one-sentence player task
		minibrief: { type: String, default: "" }, // AI flavor narrative
		intelGate: { type: String, default: null }, // what this phase produces
		isFinal: { type: Boolean, default: false },

		// Phase geography — each phase can be a different province
		province: { type: String, default: "" },
		biome: { type: String, default: "" },
		missionTypeId: { type: String, default: "" },
		location: { type: Schema.Types.Mixed, default: null }, // full location object

		// Algorithmic points from GeneratePointsOnMap()
		infilPoint: { type: Schema.Types.Mixed, default: null },
		exfilPoint: { type: Schema.Types.Mixed, default: null },
		rallyPoint: { type: Schema.Types.Mixed, default: null },
		infilMethod: { type: String, default: "" },
		exfilMethod: { type: String, default: "" },
		approachVector: { type: String, default: "" },

		// Map data for this phase's province
		bounds: { type: Schema.Types.Mixed, default: null },
		imgURL: { type: String, default: "" },

		// Full briefing text for this phase (generateBriefing() output)
		briefingText: { type: String, default: "" },

		// AI-generated tactical context
		timeOfDay: {
			type: String,
			enum: ["night", "dawn", "day", "dusk", null],
			default: null,
		},
		threatLevel: {
			type: String,
			enum: ["low", "medium", "high", "critical", null],
			default: null,
		},

		// Two-structure operation fields
		actIndex: { type: Number, default: 0 },          // which act this phase belongs to
		teamLabel: { type: String, default: "" },         // e.g. "Alpha", "Bravo"
		teamSize: { type: String, default: "" },          // e.g. "2-man", "full squad"
		task: { type: String, default: "" },              // specific team task for this phase
		specialistRequired: { type: String, default: null }, // e.g. "medic", "demo"
		unlockedBy: { type: String, default: null },      // phaseIndex of the gate phase

		// Unlock status
		// active   — current phase, player sees full briefing
		// pending  — locked, player sees label + objective only
		// complete — player has filed a phase report for this phase
		status: {
			type: String,
			enum: ["active", "pending", "complete"],
			default: "pending",
		},
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

		// ── AI campaign fields ─────────────────────────────────────────────────
		// Only populated when mission is generated via AI Ops mode.
		// Standard random/ops missions leave these at defaults.
		aiGenerated: { type: Boolean, default: false },
		opType: { type: String, default: "" }, // rescue, hvt_hunt, etc.
		operationNarrative: { type: String, default: "" }, // AI-written backstory
		campaignPhases: { type: [CampaignPhaseSchema], default: [] },
		operationStructure: {
			type: String,
			enum: ["direct_action", "intel_then_strike"],
			default: "direct_action",
		},
		friendlyConcerns: { type: String, default: "" },
		exfilPlan: { type: String, default: "" },
	},
	{
		timestamps: true,
	},
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

MissionSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Mission", MissionSchema);
