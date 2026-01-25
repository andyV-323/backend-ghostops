const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema({
	//cognito user
	createdBy: { type: String, required: true },
	callSign: { type: String, required: true },
	class: {
		type: String,
		default: "Assault",
	},
	status: {
		type: String,
		enum: ["Active", "Injured", "KIA"],
		default: "Active",
	},
	image: { type: String, default: "/ghost/Default.png" },
	support: { type: Boolean, default: false },
	role: { type: String },
	aviator: { type: Boolean, default: false },
	imageKey: { type: String, default: null },
	weaponType: { type: String, default: null },
	weapon: { type: String, default: null },
	sideArm: { type: String, default: null },
	items: { type: [String], default: [] },
});

module.exports = mongoose.model("Operator", operatorSchema);
