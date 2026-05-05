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
	AO: { type: String, default: null },
	assets: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Vehicle",
		},
	],
	attachedTeams: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Team",
		},
	],
});

module.exports = mongoose.model("Team", teamSchema);
