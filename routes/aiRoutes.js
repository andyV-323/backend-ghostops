// routes/aiRoutes.js
const express  = require("express");
const router   = express.Router();
const { generateAdvisory, generateAAR, generateBio } = require("../controllers/AiController");

// POST /api/ai/advisory — generate two COAs for a chosen mission
// POST /api/ai/aar      — generate an after action report
// POST /api/ai/bio      — generate a classified operator bio

router.post("/advisory", generateAdvisory);
router.post("/aar",      generateAAR);
router.post("/bio",      generateBio);

module.exports = router;
