const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
	//Cognito user
	createdBy: { type: String, required: true },
	operators: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Operator",
		},
	],
	name: { type: String, required: true },
	AO: { type: String },
	assets: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Vehicle",
		},
	],
});

module.exports = mongoose.model("Team", teamSchema);
