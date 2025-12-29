const mongoose = require("mongoose");

const missionSchema = mongoose.Schema({
	//Cognito user
	createdBy: { type: String, required: true },
	name: { type: String, required: true },
	teams: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Team",
		},
	],
	status: {
		type: String,
		required: true,
		default: "In Progress",
		enum: ["Planning", "In Progress", "Completed", "Failed", "Aborted"],
	},
	location: { type: String },
	teamRoles: [
		{
			teamId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Team",
			},
			role: { type: String },
		},
	],
});

module.exports = mongoose.model("Mission", missionSchema);
