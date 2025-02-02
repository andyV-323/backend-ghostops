const mongoose = require("mongoose");

const infirmarySchema = new mongoose.Schema({
  createdBy: { type: String, required: true },
  operator: { type: mongoose.Schema.ObjectId, ref: "Operator", default: null },
  injuryType: { type: String, required: true },
  recoveryDays: { type: Number, required: true },
  injuredAt: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model("Infirmary", infirmarySchema);
