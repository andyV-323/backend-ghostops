const express = require("express");
const router = express.Router();
const infirmaryController = require("../controllers/InfirmaryController");

//API Routes for Infirmary
router.post("/", infirmaryController.addInjuredOperator);
router.get("/", infirmaryController.getInjuredOperators);
router.get("/:id", infirmaryController.getInjuredOperatorById);
router.put("/:id", infirmaryController.updateInjury);
router.delete("/:id", infirmaryController.removeInjuredOperator);

module.exports = router;
