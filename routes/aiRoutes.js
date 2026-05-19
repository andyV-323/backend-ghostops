// routes/aiRoutes.js
const express  = require("express");
const router   = express.Router();
const { generateCampaign, generateAAR, generateBio } = require("../controllers/AiController");

// POST /api/ai/campaign — generate a full AI campaign phase chain
// POST /api/ai/aar      — generate an after action report
// POST /api/ai/bio      — generate a classified operator bio

router.post("/campaign", generateCampaign);
router.post("/aar",      generateAAR);
router.post("/bio",      generateBio);

module.exports = router;
