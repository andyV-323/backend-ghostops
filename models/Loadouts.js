// Loadouts are embedded directly in the Operator model (models/Operator.js).
// This file is not used — kept for reference only.

const mongoose = require("mongoose");

const loadoutsSchema = new mongoose.Schema({
	createdBy:  { type: String, required: true },
	missionProfile: {
		type: String,
		enum: ["DA", "RECON", "SAB", "SUS", "COV"],
	},
	primaryType: { type: String, default: null },
	primary:     { type: String, default: null },
	primaryAttachments: {
		muzzle:      { type: String, default: null },
		magazine:    { type: String, default: null },
		sight:       { type: String, default: null },
		rail:        { type: String, default: null },
		underbarrel: { type: String, default: null },
		stock:       { type: String, default: null },
	},
	secondaryType: { type: String, default: null },
	secondary:     { type: String, default: null },
	secondaryAttachments: {
		muzzle:      { type: String, default: null },
		magazine:    { type: String, default: null },
		sight:       { type: String, default: null },
		rail:        { type: String, default: null },
		underbarrel: { type: String, default: null },
		stock:       { type: String, default: null },
	},
	sideArm: { type: String, default: null },
	sideArmAttachments: {
		muzzle:   { type: String, default: null },
		magazine: { type: String, default: null },
		sight:    { type: String, default: null },
		rail:     { type: String, default: null },
	},
});

module.exports = mongoose.model("Loadout", loadoutsSchema);
