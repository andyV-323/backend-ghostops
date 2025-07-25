// routes/vehicleRoutes.js
const express = require("express");
const router = express.Router();
const {
	createVehicle,
	getVehicles,
	getVehicleById,
	updateVehicle,
	deleteVehicle,
	repairVehicle,
	addVehicleRepair,
	updateVehicleCondition,
} = require("../controllers/VehicleController");

// Vehicle CRUD routes
router.post("/", createVehicle);
router.get("/", getVehicles);
router.get("/:id", getVehicleById);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

// Repair routes
router.post("/:id/repair", repairVehicle);
router.post("/repair", addVehicleRepair);
router.put("/:id/condition", updateVehicleCondition);

module.exports = router;
