const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
	createdBy: { type: String, required: true },
	nickName:  { type: String, default: "None" },
	vehicle: {
		type: String,
		default: "Resistance Car",
		required: true,
	},
	remainingFuel: {
		type: Number,
		default: 100,
	},

	// ── Wear system ───────────────────────────────────────────────────────────
	// wearPercent (0–100) is the single source of truth for vehicle health.
	// Condition label is derived from wearPercent — not stored separately.
	// Repair resets wearPercent to 0.
	wearPercent: {
		type: Number,
		default: 0,
		min: 0,
		max: 100,
	},

	// ── Repair state ──────────────────────────────────────────────────────────
	repairTime:   { type: Number, default: null },   // estimated hours (sent to Step Function)
	isRepairing:  { type: Boolean, default: false },
	executionArn: { type: String, default: null },

	// ── Odometers (lifetime, never reset) ────────────────────────────────────
	totalMileage: { type: Number, default: 0 },      // ground vehicles: km
	flightHours:  { type: Number, default: 0 },      // aircraft: hours
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
