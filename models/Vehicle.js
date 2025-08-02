const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
	//cognito user
	createdBy: { type: String, required: true },
	nickName: { type: String, default: "None" },
	vehicle: {
		type: String,
		default: "Resistance Car",
		required: true,
	},
	remainingFuel: {
		type: Number,
		default: 100,
	},
	condition: {
		type: String,
		default: "Optimal",
	},
	repairTime: {
		type: Number,
		default: null,
	},
	isRepairing: {
		type: Boolean,
		default: false,
	},
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
