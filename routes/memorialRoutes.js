const express = require("express");
const router = express.Router();
const memorialController = require("../controllers/MemorialController");

//API Routes for Memorial
router.post("/", memorialController.addToMemorial);
router.get("/", memorialController.getMemorializedOperators);
router.get("/:id", memorialController.getMemorializedOperatorById);
router.delete("/:id", memorialController.removeFromMemorial);

module.exports = router;
