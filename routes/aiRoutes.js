// routes/aiRoutes.js
const express  = require("express");
const router   = express.Router();
const { generateCampaign, generateAAR } = require("../controllers/AiController");

// POST /api/ai/campaign — generate a full AI campaign phase chain
// POST /api/ai/aar      — generate an after action report

router.post("/campaign", generateCampaign);
router.post("/aar",      generateAAR);

module.exports = router;
