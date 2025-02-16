const mongoose = require("mongoose");

const memorialSchema = new mongoose.Schema({
	//Cognito user
	createdBy: { type: String, required: true },
	operator: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Operator",
		required: true,
	},
	name: { type: String, required: true },
	dateOfDeath: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Memorial", memorialSchema);
