const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Recon Answers ────────────────────────────────────────────
// Raw answers from ReconDebrief / ReconDebriefAdvanced onComplete()
const ReconAnswersSchema = new Schema(
	{
		// Standard + Advanced shared
		survey: { type: String, enum: ["full", "partial", "none"] },
		compromise: {
			type: String,
			enum: ["cold", "warm", "engaged", "engaged_exfil", "burned"],
		},
		casualties: { type: String, enum: ["none", "wia", "kia"] },
		teamSize: { type: String, enum: ["solo", "two", "squad"] },

		// Advanced only — type-specific answers
		reconType: {
			type: String,
			enum: ["standard", "route", "area", "zone", "rif", "special"],
		},
		routeStatus: { type: String, enum: ["cleared", "partial", "compromised"] }, // route recon
		observation: { type: String, enum: ["short", "extended", "long"] }, // special recon
		rifIntel: {
			type: String,
			enum: ["patterns", "reinforcements", "defensive", "limited"],
		}, // rif

		// Assets used (advanced) — stored as array of asset ID strings
		assets: [{ type: String }],
	},
	{ _id: false },
);

// ─── Recon Modifiers ─────────────────────────────────────────
// Full output of getMissionModifiers() / getAdvancedMissionModifiers().
// Stored as Mixed so the complete object is preserved — includes compromiseBadge,
// intelAccuracy, difficulty, UAS, crossCom, launchWindows, enemyState, etc.
// ReconBriefingCard and ReconHistoryPanel read directly from this stored value.

// ─── Recon Report ─────────────────────────────────────────────
// One completed ReconTool debrief. Multiple per mission.
const ReconReportSchema = new Schema(
	{
		completedAt: { type: Date, default: Date.now },
		reconType: {
			type: String,
			enum: ["standard", "route", "area", "zone", "rif", "special"],
			default: "standard",
		},
		answers: { type: ReconAnswersSchema, default: {} },
		modifiers: { type: Schema.Types.Mixed, default: {} }, // full getMissionModifiers() output
	},
	{ timestamps: false },
);

// ─── Generator Output ─────────────────────────────────────────
// Whatever MissionGenerator produced — same shape for all generation modes
const GeneratorSchema = new Schema(
	{
		generationMode: {
			type: String,
			enum: ["random", "ops"],
			default: "random",
		},
		selectedLocations: { type: [Schema.Types.Mixed], default: [] }, // location objects from your existing generator
		mapBounds: { type: Schema.Types.Mixed }, // [[minX,minY],[maxX,maxY]]
		imgURL: { type: String, default: "" }, // province image

		// Insertion/extraction points — stored as [x, y] pixel arrays
		// (output of generateInsertionExtractionPoints)
		infilPoint: { type: Schema.Types.Mixed, default: null },
		exfilPoint: { type: Schema.Types.Mixed, default: null },
		fallbackExfil: { type: Schema.Types.Mixed, default: null },
	},
	{ _id: false },
);

// ─── Mission ──────────────────────────────────────────────────
const MissionSchema = new Schema(
	{
		// Auth — Cognito sub or username
		createdBy: { type: String, required: true, index: true },

		// Identity
		name: { type: String, required: true, trim: true, maxlength: 80 },
		status: {
			type: String,
			enum: ["planning", "active", "complete"],
			default: "planning",
		},

		// Province / biome — top-level so mission list can display without
		// unpacking the generator sub-document
		province: { type: String, default: "" },
		biome: { type: String, default: "" },

		// Mission Generator output
		generator: { type: GeneratorSchema, default: () => ({}) },

		// AI OPORD briefing text — only populated after user hits Generate Briefing
		briefingText: { type: String, default: "" },

		// Recon reports — appended one at a time, never replaced
		reconReports: { type: [ReconReportSchema], default: [] },

		// Player scratchpad — freetext notes, no structure required
		notes: { type: String, default: "", maxlength: 2000 },
	},
	{
		timestamps: true, // adds createdAt + updatedAt automatically
	},
);

// ─── Indexes ──────────────────────────────────────────────────
// Fast lookup of all missions belonging to a user, newest first
MissionSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Mission", MissionSchema);
