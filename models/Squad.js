const mongoose = require("mongoose");

const squadSchema = new mongoose.Schema(
	{
		createdBy: { type: String, required: true }, // Cognito sub
		name: { type: String, required: true, trim: true },

		// Only operators (non-support, non-aviator) are squad-assigned.
		// Enablers and Aviation are a shared pool — not stored here.
		operators: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Operator",
			},
		],

		isActive: { type: Boolean, default: false }, // one squad on deck at a time
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Squad", squadSchema);
