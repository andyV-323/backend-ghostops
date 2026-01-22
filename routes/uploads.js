const express = require("express");
const crypto = require("crypto");
const path = require("path");
const {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const EXT = { "image/png": "png", "image/jpeg": "jpg" };

router.post("/presign", async (req, res) => {
	try {
		const userId = req.userId;
		const { fileName, fileType, operatorId } = req.body || {};

		if (!userId) return res.status(401).json({ error: "Unauthorized" });
		if (!fileName || !fileType)
			return res.status(400).json({ error: "fileName and fileType required" });
		if (!ALLOWED_TYPES.has(fileType))
			return res.status(400).json({ error: "Only PNG/JPEG allowed" });

		const safeName = path
			.basename(fileName)
			.replace(/[^a-zA-Z0-9._-]/g, "_")
			.slice(0, 60);
		const rand = crypto.randomBytes(16).toString("hex");
		const ext = EXT[fileType];

		const opPart =
			operatorId ?
				String(operatorId).replace(/[^a-zA-Z0-9_-]/g, "")
			:	"unassigned";
		const key = `users/${userId}/operators/${opPart}/${Date.now()}_${rand}_${safeName}.${ext}`;

		const cmd = new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			ContentType: fileType,
		});

		const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
		return res.json({ uploadUrl, key });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: "Failed to presign upload" });
	}
});

router.get("/view-url", async (req, res) => {
	try {
		const userId = req.userId;
		const key = String(req.query.key || "");

		if (!userId) return res.status(401).json({ error: "Unauthorized" });
		if (!key.startsWith(`users/${userId}/`))
			return res.status(403).json({ error: "Forbidden" });

		const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
		const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
		return res.json({ url });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: "Failed to sign view url" });
	}
});

module.exports = router;
