const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema({
	//cognito user
	createdBy: { type: String, required: true },
	name: { type: String, default: "Unknown" },
	callSign: { type: String, required: true },
	sf: { type: String, default: "Ghost Recon" },
	nationality: { type: String, default: "USA" },
	rank: { type: String, default: "Unknown" },
	class: {
		type: String,
		default: "Assault",
	},
	gear: {
		type: String,
		default: "DEFAULT",
	},
	secondaryClass: {
		type: String,
		default: null,
	},
	secondaryGear: { type: String, default: "DEFAULT" },

	status: {
		type: String,
		enum: ["Active", "Injured", "KIA"],
		default: "Active",
	},
	primaryWeapon1: {
		type: String,
		default: "/icons/empty.svg",
	},
	primaryname: {
		type: String,
		default: null,
	},
	sidearm1: { type: String, default: null },
	secondaryWeapon1: {
		type: String,

		default: "/icons/empty.svg",
	},
	secondaryname: {
		type: String,
		default: null,
	},
	primaryWeapon2: {
		type: String,

		default: null,
	},
	primaryname2: {
		type: String,
		default: null,
	},
	sidearm2: { type: String, default: null },
	secondaryWeapon2: {
		type: String,

		default: null,
	},
	secondaryname2: {
		type: String,
		default: null,
	},
	image: { type: String, default: "/ghost/Default.png" },
	bio: { type: String, default: "No Bio Available" },
});

module.exports = mongoose.model("Operator", operatorSchema);
