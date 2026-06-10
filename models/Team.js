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
	// Maps operatorId (string) → slot class name assigned on this team
	operatorRoles: {
		type: Map,
		of: String,
		default: {},
	},
	// The operator designated as team lead (string ObjectId)
	leadId: {
		type: String,
		default: null,
	},
});

module.exports = mongoose.model("Team", teamSchema);
