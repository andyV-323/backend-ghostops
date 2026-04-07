const Vehicle = require("../models/Vehicle");
const {
	EventBridgeClient,
	PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const eventBridge = new EventBridgeClient({ region: "us-east-1" });
const EVENT_BUS_NAME = "default";

// ─── EventBridge Helper ────────────────────────────────────────────────────

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

	// EventBridge can partially fail even with a 200 — always check this
	if (result.FailedEntryCount > 0) {
		const failed = result.Entries.find((e) => e.ErrorCode);
		throw new Error(
			`EventBridge rejected event: ${failed?.ErrorCode} — ${failed?.ErrorMessage}`,
		);
	}

	console.log(`[EventBridge] RepairVehicle event sent for ${vehicleId}`);
};

// ─── Shared repair initiation logic ───────────────────────────────────────
// Both repairVehicle and addVehicleRepair were doing identical work.
// Extracted here to avoid duplication and ensure consistent rollback behavior.

const initiateRepair = async (vehicleId, userId) => {
	const vehicle = await Vehicle.findOne({ _id: vehicleId, createdBy: userId });

	if (!vehicle) {
		const err = new Error("Vehicle not found or unauthorized");
		err.statusCode = 404;
		throw err;
	}

	if (vehicle.condition === "Optimal") {
		const err = new Error("Vehicle is already in optimal condition");
		err.statusCode = 400;
		throw err;
	}

	if (vehicle.isRepairing || vehicle.executionArn) {
		const err = new Error("Vehicle repair is already in progress");
		err.statusCode = 400;
		err.executionArn = vehicle.executionArn;
		throw err;
	}

	// Mark as repairing before firing EventBridge
	await Vehicle.findByIdAndUpdate(vehicleId, { isRepairing: true });

	try {
		await triggerVehicleRepair(vehicleId);
	} catch (eventError) {
		// EventBridge failed — roll back isRepairing so vehicle isn't stuck
		await Vehicle.findByIdAndUpdate(vehicleId, { isRepairing: false });
		console.log(`[Vehicle] Rolled back isRepairing for ${vehicleId}`);
		throw eventError;
	}

	return vehicle;
};

// ─── Controllers ──────────────────────────────────────────────────────────

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
			remainingFuel: req.body.remainingFuel || 100,
			condition: req.body.condition || "Optimal",
			repairTime: req.body.repairTime || 0,
			isRepairing: false,
		});

		await vehicle.save();
		return res
			.status(201)
			.json({ message: "Vehicle created successfully!", vehicle });
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
		const vehicle = await Vehicle.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		});

		if (!vehicle) {
			return res.status(404).json({ message: "Vehicle not found" });
		}

		return res.status(200).json(vehicle);
	} catch (error) {
		console.error("[Vehicle] Error fetching vehicle:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Initiate repair via route param ID (e.g. PATCH /vehicles/:id/repair)
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
			currentCondition: vehicle.condition,
			estimatedRepairTime: vehicle.repairTime || 2,
			isRepairing: true,
		});
	} catch (error) {
		console.error("[Vehicle] Error in repairVehicle:", error.message);
		return res
			.status(error.statusCode || 500)
			.json({ error: error.message, executionArn: error.executionArn });
	}
};

// POST — Initiate repair via body vehicle ID (e.g. POST /vehicles/repair)
exports.addVehicleRepair = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.body.vehicle;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		await initiateRepair(vehicleId, userId);

		return res.status(200).json({
			message: "Vehicle repair initiated",
			isRepairing: true,
		});
	} catch (error) {
		console.error("[Vehicle] Error in addVehicleRepair:", error.message);
		return res.status(error.statusCode || 500).json({ error: error.message });
	}
};

// PUT — Update vehicle condition (called by Step Function Lambda on repair complete)
exports.updateVehicleCondition = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const updateData = { ...req.body };

		// When condition is restored to Optimal, clear repair state
		if (req.body.condition === "Optimal") {
			updateData.isRepairing = false;
			updateData.executionArn = null;
		}

		const updatedCondition = await Vehicle.findOneAndUpdate(
			{ _id: vehicleId, createdBy: userId },
			updateData,
			{ new: true, runValidators: true },
		);

		if (!updatedCondition) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		// NOTE: sendRepairEvent was called here previously but was never defined.
		// The StopStepFunctionOnRecovery EventBridge rule handles stopping the
		// execution — no manual event needed from this controller.

		return res.status(200).json({
			message: "Vehicle condition updated successfully!",
			vehicle: updatedCondition,
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
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
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
		const vehicle = await Vehicle.findOneAndDelete({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		return res.status(200).json({ message: "Vehicle deleted successfully!" });
	} catch (error) {
		console.error("[Vehicle] Error deleting vehicle:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// GET — Check if vehicle is available (not repairing)
exports.checkVehicleAvailability = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await Vehicle.findOne({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		const isAvailable = !vehicle.isRepairing;

		return res.status(200).json({
			vehicleId,
			isAvailable,
			isRepairing: vehicle.isRepairing,
			condition: vehicle.condition,
			message:
				isAvailable ?
					"Vehicle is available for use"
				:	"Vehicle is currently being repaired and unavailable",
		});
	} catch (error) {
		console.error("[Vehicle] Error checking availability:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// POST — Refuel vehicle (blocked if repairing)
exports.refuelVehicle = async (req, res) => {
	const userId = req.userId;
	const vehicleId = req.params.id;
	const { fuelAmount } = req.body;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const vehicle = await Vehicle.findOne({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		if (vehicle.isRepairing) {
			return res.status(400).json({
				message: "Cannot refuel vehicle while it's being repaired",
				isRepairing: true,
			});
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
