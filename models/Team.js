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
});

module.exports = mongoose.model("Team", teamSchema);
