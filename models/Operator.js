const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
	{
		barrel: { type: String, default: null },
		magazine: { type: String, default: null },
		muzzle: { type: String, default: null },
		rail: { type: String, default: null },
		scope: { type: String, default: null },
		stock: { type: String, default: null },
		underbarrel: { type: String, default: null },
	},
	{ _id: false },
);

// Primary and secondary slots include a weapon category (ASR, DMR, etc.)
const weaponSlotSchema = new mongoose.Schema(
	{
		weaponType: { type: String, default: null },
		weapon: { type: String, default: null },
		attachments: { type: attachmentSchema, default: () => ({}) },
	},
	{ _id: false },
);

const loadoutSchema = new mongoose.Schema(
	{
		missionProfile: {
			type: String,
			enum: ["DA", "RECON", "SAB", "SUS", "COV"],
		},
		primary: { type: weaponSlotSchema, default: () => ({}) },
		secondary: { type: weaponSlotSchema, default: () => ({}) },
		// Handgun is always HDG type — weaponType stored for consistency
		handgun: { type: weaponSlotSchema, default: () => ({}) },
	},
	{ _id: false },
);

const operatorSchema = new mongoose.Schema({
	createdBy: { type: String, required: true },
	callSign: { type: String, required: true },
	class: { type: String, default: "Assault" },
	status: {
		type: String,
		enum: ["Active", "Injured", "KIA"],
		default: "Active",
	},
	image: { type: String, default: "/ghost/Default.png" },
	role: { type: String },
	imageKey: { type: String, default: null },
	items: { type: [String], default: [] },
	perks: { type: [String], default: [] },
	loadouts: { type: [loadoutSchema], default: [] },
});

module.exports = mongoose.model("Operator", operatorSchema);
