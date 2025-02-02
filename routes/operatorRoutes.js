const express = require("express");
const router = express.Router();
const operatorController = require("../controllers/operatorController");

//Define Routes
router.post("/", operatorController.createOperator);
router.get("/", operatorController.getOperators);
router.get("/:id", operatorController.getOperatorById);
router.put("/:id", operatorController.updateOperator);
router.delete("/:id", operatorController.deleteOperator);

module.exports = router;
