const mongoose = require("mongoose");

const shortLinkSchema = new mongoose.Schema(
	{
		code: { type: String, required: true, unique: true, index: true },
		url: { type: String, required: true },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("ShortLink", shortLinkSchema);
