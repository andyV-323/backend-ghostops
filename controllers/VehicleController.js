const Vehicle = require("../models/Vehicle");

const {
	EventBridgeClient,
	PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
// Initialize AWS EventBridge Client
const eventBridge = new EventBridgeClient({ region: "us-east-1" }); // Update with your region

const EVENT_BUS_NAME = "default";

// Function to send event to AWS EventBridge
const triggerVehicleRepair = async (vehicleId) => {
	try {
		const eventDetail = { vehicle_id: vehicleId };
		const eventEntry = {
			Source: "ghostopsai.vehicles",
			DetailType: "RepairVehicle",
			Detail: JSON.stringify(eventDetail),
			EventBusName: EVENT_BUS_NAME,
		};

		const command = new PutEventsCommand({
			Entries: [eventEntry],
		});

		const result = await eventBridge.send(command);

		if (result.FailedEntryCount && result.FailedEntryCount > 0) {
			result.Entries.forEach((entry, index) => {
				if (entry.ErrorCode) {
					console.error(`Entry ${index}:`, entry.ErrorCode, entry.ErrorMessage);
				}
			});
			throw new Error(
				`EventBridge failed to send ${result.FailedEntryCount} events`
			);
		}
	} catch (error) {
		console.error("EventBridge error:", error.name);
		console.error("Error message:", error.message);
		console.error("Error stack:", error.stack);
		throw error;
	}
};

//POST a New Vehicle
exports.createVehicle = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const VehicleData = {
			createdBy: userId,
			nickName: req.body.nickname || "None",
			vehicle: req.body.vehicle || "Resistance Car",
			remainingFuel: req.body.remainingFuel || 100,
			condition: req.body.condition || "Optimal",
			repairTime: req.body.repairTime || 0,
			isRepairing: req.body.isRepairing || false,
		};

		const vehicle = new Vehicle(VehicleData);

		await vehicle.save();
		res.status(201).json({ message: "Vehicle created successfully!", vehicle });
	} catch (error) {
		console.error("Error Creating Vehicle:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// GET All Vehicles by Cognito User
exports.getVehicles = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		//Only return vehicles created by the logged-in user
		const vehicles = await Vehicle.find({ createdBy: userId });

		res.status(200).json(vehicles);
	} catch (error) {
		console.error("Error Fetching Vehicles:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// GET a Single Vehicle by ID
exports.getVehicleById = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const vehicle = await Vehicle.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		});
		if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

		res.status(200).json(vehicle);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// POST Vehicle Repair
exports.repairVehicle = async (req, res) => {
	try {
		const userId = req.userId;
		const vehicleId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		// Check if Vehicle exists and belongs to user
		const vehicle = await Vehicle.findOne({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		// Check conditions
		if (vehicle.condition === "Optimal") {
			return res
				.status(400)
				.json({ message: "Vehicle is already in optimal condition" });
		}

		// Check if vehicle is already being repaired
		if (vehicle.isRepairing) {
			return res.status(400).json({
				message: "Vehicle repair is already in progress",
				vehicleId: vehicleId,
				executionArn: vehicle.executionArn,
			});
		}

		if (vehicle.executionArn) {
			return res.status(400).json({
				message: "Vehicle repair is already in progress",
				executionArn: vehicle.executionArn,
			});
		}

		// Set vehicle as repairing before triggering the repair process
		await Vehicle.findByIdAndUpdate(vehicleId, {
			isRepairing: true,
		});

		// Trigger AWS EventBridge to Start Step Functions
		await triggerVehicleRepair(vehicleId);

		res.status(200).json({
			message: "Vehicle repair process initiated successfully",
			vehicleId: vehicleId,
			currentCondition: vehicle.condition,
			estimatedRepairTime: vehicle.repairTime || 2,
			isRepairing: true,
		});
	} catch (error) {
		console.error("ERROR in repairVehicle controller:", error);
		// If there's an error, make sure to reset isRepairing to false
		if (req.params.id) {
			await Vehicle.findByIdAndUpdate(req.params.id, { isRepairing: false });
		}
		res.status(500).json({ error: error.message });
	}
};

// Add Vehicle Repair
exports.addVehicleRepair = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		//Check if Vehicle Exists
		const vehicle = await Vehicle.findOne({
			_id: req.body.vehicle,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		// Check if vehicle is already being repaired
		if (vehicle.isRepairing) {
			return res.status(400).json({
				message: "Vehicle repair is already in progress",
				vehicleId: req.body.vehicle,
			});
		}

		// Set vehicle as repairing
		await Vehicle.findByIdAndUpdate(req.body.vehicle, {
			isRepairing: true,
		});

		// Trigger AWS EventBridge to Start Step Functions
		await triggerVehicleRepair(req.body.vehicle);

		res.status(200).json({
			message: "Vehicle repair initiated",
			isRepairing: true,
		});
	} catch (error) {
		console.error("Error Adding Vehicle to repair:", error.message);
		// Reset isRepairing on error
		if (req.body.vehicle) {
			await Vehicle.findByIdAndUpdate(req.body.vehicle, { isRepairing: false });
		}
		res.status(400).json({ error: error.message });
	}
};

exports.updateVehicleCondition = async (req, res) => {
	try {
		const userId = req.userId;
		const vehicleId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		// If the repair is complete (condition is "Optimal"), set isRepairing to false
		const updateData = { ...req.body };
		if (req.body.condition === "Optimal") {
			updateData.isRepairing = false;
		}

		const updatedCondition = await Vehicle.findOneAndUpdate(
			{ _id: vehicleId, createdBy: userId },
			updateData,
			{ new: true, runValidators: true }
		);

		if (!updatedCondition) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		//Send Recovery Event to AWS EventBridge with Execution ARN
		if (updatedCondition.executionArn) {
			await sendRepairEvent(updatedCondition._id);
		}

		res.status(200).json({
			message: "Vehicle Condition updated successfully!",
			vehicle: updatedCondition,
		});
	} catch (error) {
		console.error("Error Updating Vehicle Condition:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// UPDATE Vehicle
exports.updateVehicle = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const vehicle = await Vehicle.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true }
		);

		if (!vehicle)
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });

		res.status(200).json({ message: "Vehicle updated!", vehicle });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

//DELETE Vehicle
exports.deleteVehicle = async (req, res) => {
	try {
		const userId = req.userId;
		const vehicleId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const vehicle = await Vehicle.findOneAndDelete({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		res.status(200).json({ message: "Vehicle deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Vehicle:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// New endpoint to check if vehicle is available for use/refuel
exports.checkVehicleAvailability = async (req, res) => {
	try {
		const userId = req.userId;
		const vehicleId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

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

		res.status(200).json({
			vehicleId: vehicleId,
			isAvailable: isAvailable,
			isRepairing: vehicle.isRepairing,
			condition: vehicle.condition,
			message: isAvailable
				? "Vehicle is available for use"
				: "Vehicle is currently being repaired and unavailable",
		});
	} catch (error) {
		console.error("Error checking vehicle availability:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// New endpoint for refueling (with availability check)
exports.refuelVehicle = async (req, res) => {
	try {
		const userId = req.userId;
		const vehicleId = req.params.id;
		const { fuelAmount } = req.body;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const vehicle = await Vehicle.findOne({
			_id: vehicleId,
			createdBy: userId,
		});

		if (!vehicle) {
			return res
				.status(404)
				.json({ message: "Vehicle not found or unauthorized" });
		}

		// Check if vehicle is being repaired
		if (vehicle.isRepairing) {
			return res.status(400).json({
				message: "Cannot refuel vehicle while it's being repaired",
				isRepairing: true,
			});
		}

		// Validate fuel amount
		if (!fuelAmount || fuelAmount <= 0) {
			return res.status(400).json({ message: "Invalid fuel amount" });
		}

		const newFuelLevel = Math.min(vehicle.remainingFuel + fuelAmount, 100);

		const updatedVehicle = await Vehicle.findByIdAndUpdate(
			vehicleId,
			{ remainingFuel: newFuelLevel },
			{ new: true }
		);

		res.status(200).json({
			message: "Vehicle refueled successfully!",
			vehicle: updatedVehicle,
			fuelAdded: newFuelLevel - vehicle.remainingFuel,
		});
	} catch (error) {
		console.error("Error refueling vehicle:", error.message);
		res.status(500).json({ error: error.message });
	}
};
