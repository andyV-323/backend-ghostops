const express   = require("express");
const rateLimit = require("express-rate-limit");
const { handleShorten, handleRedirect } = require("../controllers/ShortLinkController");

const router = express.Router();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15-minute window
	max: 30,                    // max 30 shorten requests per IP per window
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many link requests. Please wait 15 minutes and try again." },
});

// Public — creates a short code for one of our own Ops Builder share links
router.post("/api/shorten", limiter, handleShorten);

// Public — short link redirect, e.g. /s/operation-frozen-sigil
router.get("/s/:code", handleRedirect);

module.exports = router;
