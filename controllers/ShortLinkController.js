const crypto = require("crypto");
const ShortLink = require("../models/ShortLink");

const MAX_CODE_LEN = 60;

// Never store/redirect arbitrary third-party URLs — only our own Ops
// Builder share links.
const ALLOWED_HOSTS = new Set([
	"localhost:5173",
	"ghostopsai.com",
	"www.ghostopsai.com",
]);

function isAllowedTarget(rawUrl) {
	let u;
	try {
		u = new URL(rawUrl);
	} catch {
		return false;
	}
	return (
		["http:", "https:"].includes(u.protocol) &&
		ALLOWED_HOSTS.has(u.host) &&
		u.pathname.startsWith("/ops/reader")
	);
}

function sanitizeCode(raw) {
	if (typeof raw !== "string") return "";
	return raw
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_CODE_LEN);
}

const randomSuffix = () => crypto.randomBytes(3).toString("hex");

exports.handleShorten = async (req, res) => {
	const { url, alias } = req.body || {};
	if (!isAllowedTarget(url)) {
		return res.status(400).json({ error: "Invalid or disallowed URL." });
	}

	const baseCode = sanitizeCode(alias) || randomSuffix();
	// Try the mission-name code as-is, then a couple of suffixed retries if
	// it's already taken (unique index makes this collision-safe).
	const candidates = [baseCode, `${baseCode}-${randomSuffix()}`, randomSuffix()];

	for (const code of candidates) {
		try {
			await ShortLink.create({ code, url });
			const shortUrl = `${req.protocol}://${req.get("host")}/s/${code}`;
			return res.status(200).json({ shortUrl });
		} catch (err) {
			if (err.code !== 11000) {
				console.error("Short link create error:", err);
				return res.status(500).json({ error: "Could not create short link." });
			}
			// duplicate code — fall through and try the next candidate
		}
	}

	return res.status(500).json({ error: "Could not create short link." });
};

exports.handleRedirect = async (req, res) => {
	const link = await ShortLink.findOne({ code: req.params.code }).lean();
	if (!link) return res.status(404).send("Link not found");
	return res.redirect(302, link.url);
};
