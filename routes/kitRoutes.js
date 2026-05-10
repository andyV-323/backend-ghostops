const express = require("express");
const router  = express.Router();
const {
	createKit,
	getKits,
	updateKit,
	deleteKit,
} = require("../controllers/KitController");

router.post("/",    createKit);
router.get("/",     getKits);
router.put("/:id",  updateKit);
router.delete("/:id", deleteKit);

module.exports = router;
