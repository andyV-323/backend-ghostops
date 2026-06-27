const express    = require("express");
const rateLimit  = require("express-rate-limit");
const { handleContact } = require("../controllers/ContactController");

const router = express.Router();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,  // 15-minute window
	max: 5,                      // max 5 submissions per IP per window
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many messages sent. Please wait 15 minutes and try again." },
	skipSuccessfulRequests: false,
});

router.post("/", limiter, handleContact);

module.exports = router;
