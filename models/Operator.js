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
	specialist: { type: Boolean, default: false },
	specialization: { type: String },
	aviator: { type: Boolean, default: false },
});

module.exports = mongoose.model("Operator", operatorSchema);
