const Vehicle = require("../models/Vehicle");
const {
	EventBridgeClient,
	PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const eventBridge = new EventBridgeClient({ region: "us-east-1" });
const EVENT_BUS_NAME = "default";

// ─── Wear constants ────────────────────────────────────────────────────────────
// Design target: fuel should deplete before wear becomes critical under
// normal use. Extended or repeated operations grind vehicles down.
//
// Ground — 0.3% wear per km:
//   Typical vehicle range ~150–200 km (one full tank).
//   100 km op  →  30% wear  (Operational — one long mission)
//   150 km op  →  45% wear  (mid-Operational — full tank nearly gone)
//   250 km op  →  75% wear  (GROUNDED — roughly 1.5 full tanks total)
//   Players need to refuel ~1–2 times before repair is required.
//
// Aircraft — 0.5% wear per 1% fuel burned:
//   25% fuel sortie  →  12.5% wear  (light op, minimal attrition)
//   50% fuel sortie  →  25% wear    (moderate sortie, Operational)
//   Full-tank sortie →  50% wear    (Compromised after one heavy op)
//   GROUNDED after ~1.5 full sorties, or 3 sorties at 50% fuel each.

const WEAR_PER_KM       = 0.3;   // ground: % per km
const WEAR_PER_FUEL_PCT = 0.5;   // aircraft: % wear per 1% fuel burned

// Repair time scales linearly with wearPercent.
//   25% wear → 1 h
//   50% wear → 2 h
//   75% wear → 3 h
//  100% wear → 4 h
function calcRepairTime(wearPercent) {
	return Math.max(0.5, Math.round((wearPercent / 100) * 4 * 2) / 2); // rounds to nearest 0.5 h
}

// Derive a human-readable condition label from wearPercent.
// Used only for display / backwards-compat — wearPercent is the source of truth.
function deriveCondition(wearPercent) {
	if (wearPercent < 25) return "Optimal";
	if (wearPercent < 50) return "Operational";
	if (wearPercent < 75) return "Compromised";
	return "Critical";
}

// ─── EventBridge helper ────────────────────────────────────────────────────────

const triggerVehicleRepair = async (vehicleId) => {
	const command = new PutEventsCommand({
		Entries: [
			{
				Source: "ghostopsai.vehicles",
				DetailType: "RepairVehicle",
				Detail: JSON.stringify({ vehicle_id: vehicleId }),
				EventBusName: EVENT_BUS_NAME,
			},
		],
	});

	const result = await eventBridge.send(command);

	if (result.FailedEntryCount > 0) {
		const failed = result.Entries.find((e) => e.ErrorCode);
		throw new Error(
			`EventBridge rejected event: ${failed?.ErrorCode} — ${failed?.ErrorMessage}`,
		);
	}

	console.log(`[EventBridge] RepairVehicle event sent for ${vehicleId}`);
};

// ─── Shared repair initiation ──────────────────────────────────────────────────

const initiateRepair = async (vehicleId, userId) => {
	const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });

	if (!vehicle) {
		const err = new Error("Vehicle not found or unauthorized");
		err.statusCode = 404;
		throw err;
	}

	if ((vehicle.wearPercent ?? 0) === 0) {
		const err = new Error("Vehicle has no wear — repair not needed");
		err.statusCode = 400;
		throw err;
	}

	if (vehicle.isRepairing || vehicle.executionArn) {
		const err = new Error("Vehicle repair is already in progress");
		err.statusCode = 400;
		err.executionArn = vehicle.executionArn;
		throw err;
	}

	const repairTime = calcRepairTime(vehicle.wearPercent ?? 0);

	// Persist repairTime and mark as repairing before firing EventBridge
	await Vehicle.findByIdAndUpdate(vehicleId, { isRepairing: true, repairTime });

	try {
		await triggerVehicleRepair(vehicleId);
	} catch (eventError) {
		await Vehicle.findByIdAndUpdate(vehicleId, { isRepairing: false });
		console.log(`[Vehicle] Rolled back isRepairing for ${vehicleId}`);
		throw eventError;
	}

	return { ...vehicle.toObject(), repairTime };
};

// ─── Controllers ───────────────────────────────────────────────────────────────

// POST — Create a new vehicle
exports.createVehicle = async (req, res) => {
	const userId = req.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = new Vehicle({
			createdBy: userId,
			nickName: req.body.nickname || "None",
			vehicle: req.body.vehicle || "Resistance Car",
			remainingFuel: req.body.remainingFuel ?? 100,
			wearPercent: 0,
			isRepairing: false,
		});

		await vehicle.save();
		return res.status(201).json({ message: "Vehicle created successfully!", vehicle });
	} catch (error) {
		console.error("[Vehicle] Error creating vehicle:", error.message);
		return res.status(400).json({ error: error.message });
	}
};

// GET — All vehicles for this user
exports.getVehicles = async (req, res) => {
	const userId = req.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicles = await Vehicle.find({ createdBy: userId });
		return res.status(200).json(vehicles);
	} catch (error) {
		console.error("[Vehicle] Error fetching vehicles:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// GET — Single vehicle by ID
exports.getVehicleById = async (req, res) => {
	if (!req.userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const vehicle = await Vehicle.findOne({ _id: req.params.id, createdBy: req.userId });

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found" });
		}

		return res.status(200).json(vehicle);
	} catch (error) {
		console.error("[Vehicle] Error fetching vehicle:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Initiate repair (route param ID)
exports.repairVehicle = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await initiateRepair(vehicleId, userId);

		return res.status(200).json({
			message: "Vehicle repair process initiated successfully",
			vehicleId,
			wearPercent: vehicle.wearPercent,
			estimatedRepairTime: vehicle.repairTime,
			isRepairing: true,
		});
	} catch (error) {
		console.error("[Vehicle] Error in repairVehicle:", error.message);
		return res.status(error.statusCode || 500).json({ error: error.message, executionArn: error.executionArn });
	}
};

// POST — Initiate repair (body vehicle ID)
exports.addVehicleRepair = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.body.vehicle;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await initiateRepair(vehicleId, userId);

		return res.status(200).json({
			message: "Vehicle repair initiated",
			estimatedRepairTime: vehicle.repairTime,
			isRepairing: true,
		});
	} catch (error) {
		console.error("[Vehicle] Error in addVehicleRepair:", error.message);
		return res.status(error.statusCode || 500).json({ error: error.message });
	}
};

// PUT — Called by Step Function Lambda when repair is complete.
// Lambda sends { condition: "Optimal" } — we treat this as a full wear reset.
exports.updateVehicleCondition = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		// Regardless of what the Lambda sends, completing a repair means wearPercent → 0
		const updateData = {
			wearPercent: 0,
			isRepairing: false,
			executionArn: null,
			repairTime: 0,
		};

		const updatedVehicle = await Vehicle.findOneAndUpdate(
			{ _id: vehicleId, createdBy: userId },
			updateData,
			{ new: true, runValidators: true },
		);

		if (!updatedVehicle) {
			return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		}

		return res.status(200).json({
			message: "Vehicle repaired — wear reset to 0.",
			vehicle: updatedVehicle,
		});
	} catch (error) {
		console.error("[Vehicle] Error updating condition:", error.message);
		return res.status(400).json({ error: error.message });
	}
};

// PUT — General vehicle update
exports.updateVehicle = async (req, res) => {
	if (!req.userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const vehicle = await Vehicle.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true },
		);

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		}

		return res.status(200).json({ message: "Vehicle updated!", vehicle });
	} catch (error) {
		console.error("[Vehicle] Error updating vehicle:", error.message);
		return res.status(400).json({ error: error.message });
	}
};

// DELETE — Remove vehicle
exports.deleteVehicle = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const vehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, createdBy: userId });

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		}

		return res.status(200).json({ message: "Vehicle deleted successfully!" });
	} catch (error) {
		console.error("[Vehicle] Error deleting vehicle:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// GET — Check vehicle availability
exports.checkVehicleAvailability = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		}

		const wear = vehicle.wearPercent ?? 0;
		const isCritical = wear >= 75;
		const isAvailable = !vehicle.isRepairing && !isCritical;

		return res.status(200).json({
			vehicleId,
			isAvailable,
			isRepairing: vehicle.isRepairing,
			wearPercent: wear,
			condition: deriveCondition(wear),
			message:
				vehicle.isRepairing ? "Vehicle is currently being repaired"
				: isCritical        ? "Vehicle is critically worn — repair required before deployment"
				:                     "Vehicle is available for deployment",
		});
	} catch (error) {
		console.error("[Vehicle] Error checking availability:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Refuel vehicle (blocked if repairing or critically worn)
exports.refuelVehicle = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;
	const { fuelAmount } = req.body;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		}

		if (vehicle.isRepairing) {
			return res.status(400).json({ message: "Cannot refuel while repairing", isRepairing: true });
		}

		if ((vehicle.wearPercent ?? 0) >= 75) {
			return res.status(400).json({ message: "Critical wear — repair before refueling" });
		}

		if (!fuelAmount || fuelAmount <= 0) {
			return res.status(400).json({ message: "Invalid fuel amount" });
		}

		const newFuelLevel = Math.min(vehicle.remainingFuel + fuelAmount, 100);
		const updatedVehicle = await Vehicle.findByIdAndUpdate(
			vehicleId,
			{ remainingFuel: newFuelLevel },
			{ new: true },
		);

		return res.status(200).json({
			message: "Vehicle refueled successfully!",
			vehicle: updatedVehicle,
			fuelAdded: newFuelLevel - vehicle.remainingFuel,
		});
	} catch (error) {
		console.error("[Vehicle] Error refueling vehicle:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Log a ground vehicle trip
// Body: { distanceKm, fuelBurned }
// Accumulates 0.8% wear per km. At 75%+ wear the vehicle becomes Critical.
exports.logTrip = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;
	const { distanceKm, fuelBurned } = req.body;

	if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
	if (!distanceKm || distanceKm <= 0) return res.status(400).json({ message: "Invalid distanceKm" });

	try {
		const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });
		if (!vehicle) return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		if (vehicle.isRepairing) return res.status(400).json({ message: "Vehicle is being repaired" });

		const currentWear = vehicle.wearPercent ?? 0;
		if (currentWear >= 75) {
			return res.status(400).json({ message: "Critical wear — repair before deploying" });
		}

		const wearGained   = distanceKm * WEAR_PER_KM;
		const newWear      = Math.min(100, currentWear + wearGained);
		const newFuel      = Math.max(0, (vehicle.remainingFuel ?? 100) - (fuelBurned ?? 0));
		const newMileage   = (vehicle.totalMileage ?? 0) + distanceKm;
		const prevCond     = deriveCondition(currentWear);
		const newCond      = deriveCondition(newWear);

		const updatedVehicle = await Vehicle.findByIdAndUpdate(
			vehicleId,
			{ wearPercent: newWear, remainingFuel: newFuel, totalMileage: newMileage },
			{ new: true },
		);

		return res.status(200).json({
			message: "Trip logged.",
			vehicle: updatedVehicle,
			wearGained: parseFloat(wearGained.toFixed(1)),
			conditionChanged: newCond !== prevCond,
			newCondition: newCond,
		});
	} catch (error) {
		console.error("[Vehicle] Error logging trip:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Log an aircraft sortie
// Body: { hours, fuelBurned }
// Accumulates 8% wear per flight hour. At 75%+ wear the aircraft becomes Critical.
exports.logSortie = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;
	const { hours, fuelBurned } = req.body;

	if (!userId) return res.status(401).json({ message: "Unauthorized: No User ID" });
	if (!hours || hours <= 0) return res.status(400).json({ message: "Invalid hours" });

	try {
		const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });
		if (!vehicle) return res.status(404).json({ message: "Vehicle not found or unauthorized" });
		if (vehicle.isRepairing) return res.status(400).json({ message: "Vehicle is being repaired" });

		const currentWear = vehicle.wearPercent ?? 0;
		if (currentWear >= 75) {
			return res.status(400).json({ message: "Critical wear — repair before deploying" });
		}

		const wearGained    = (fuelBurned ?? 0) * WEAR_PER_FUEL_PCT;
		const newWear       = Math.min(100, currentWear + wearGained);
		const newFuel       = Math.max(0, (vehicle.remainingFuel ?? 100) - (fuelBurned ?? 0));
		const newFlightHrs  = (vehicle.flightHours ?? 0) + hours;
		const prevCond      = deriveCondition(currentWear);
		const newCond       = deriveCondition(newWear);

		const updatedVehicle = await Vehicle.findByIdAndUpdate(
			vehicleId,
			{ wearPercent: newWear, remainingFuel: newFuel, flightHours: newFlightHrs },
			{ new: true },
		);

		return res.status(200).json({
			message: "Sortie logged.",
			vehicle: updatedVehicle,
			wearGained: parseFloat(wearGained.toFixed(1)),
			conditionChanged: newCond !== prevCond,
			newCondition: newCond,
		});
	} catch (error) {
		console.error("[Vehicle] Error logging sortie:", error.message);
		return res.status(500).json({ error: error.message });
	}
};
