const mongoose = require("mongoose");

const squadSchema = new mongoose.Schema({
	//Cognito User
	createdBy: { type: String, required: true },
	operators: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Operator",
			default: [],
		},
	],
	name: { type: String, required: true },
});

module.exports = mongoose.model("Squad", squadSchema);
