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

const weaponSlotSchema = new mongoose.Schema(
	{
		weaponType: { type: String, default: null },
		weapon: { type: String, default: null },
		attachments: { type: attachmentSchema, default: () => ({}) },
	},
	{ _id: false },
);

const kitSchema = new mongoose.Schema({
	createdBy: { type: String, required: true },
	name: { type: String, required: true },
	primary: { type: weaponSlotSchema, default: () => ({}) },
	secondary: { type: weaponSlotSchema, default: () => ({}) },
	handgun: { type: weaponSlotSchema, default: () => ({}) },
	items: { type: [String], default: [] },
	perks: { type: [String], default: [] },
	helmet: { type: String, default: null },
	vest: { type: String, default: null },
	belt: { type: String, default: null },
});

module.exports = mongoose.model("Kit", kitSchema);
