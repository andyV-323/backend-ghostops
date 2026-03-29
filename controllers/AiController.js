// controllers/AiController.js
// Groq API proxy — keeps GROQ_KEY server-side.
// Frontend builds prompts and sends them here; this controller makes the Groq
// call, validates the response, and returns processed data to the client.

const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile";

// ─── POST /api/ai/campaign ────────────────────────────────────────────────────
// Body:
//   systemPrompt         — string
//   userPrompt           — string
//   province             — string  (e.g. "FenBog")
//   provinceLocationNames — string[] (exact location names from the province)

exports.generateCampaign = async (req, res) => {
	try {
		const { systemPrompt, userPrompt, province, provinceLocationNames } = req.body;

		if (!systemPrompt || !userPrompt || !province || !Array.isArray(provinceLocationNames)) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const key = process.env.GROQ_KEY;
		if (!key) {
			return res.status(500).json({ message: "AI service not configured on server" });
		}

		const groqRes = await axios.post(
			GROQ_URL,
			{
				model:           MODEL,
				max_tokens:      2400,
				temperature:     0.72,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user",   content: userPrompt   },
				],
			},
			{
				headers: {
					Authorization:  `Bearer ${key}`,
					"Content-Type": "application/json",
				},
			},
		);

		const raw = groqRes.data.choices?.[0]?.message?.content?.trim() ?? "";

		// ── Parse ─────────────────────────────────────────────────────────────
		let campaign;
		try {
			campaign = JSON.parse(raw);
		} catch {
			return res.status(422).json({
				message: "Campaign generation returned invalid JSON. Try again.",
			});
		}

		if (!campaign.phases?.length) {
			return res.status(422).json({
				message: "Campaign generation returned no phases. Try again.",
			});
		}

		// ── Validate location names ────────────────────────────────────────────
		const invalidPhases = campaign.phases.filter(
			(p) => !provinceLocationNames.some((name) => name.trim() === p.location?.trim()),
		);

		if (invalidPhases.length > 0) {
			const details = invalidPhases.map((p) => `"${p.location}"`).join(", ");
			return res.status(422).json({
				message: `AI selected invalid location(s) not found in ${province}: ${details}. Try generating again.`,
			});
		}

		// ── Stamp province onto every phase ───────────────────────────────────
		campaign.phases = campaign.phases.map((p) => ({ ...p, province }));

		res.status(200).json({ campaign });
	} catch (error) {
		console.error("Campaign generation error:", error.message);
		const upstream = error.response;
		if (upstream) {
			return res
				.status(upstream.status)
				.json({ message: `Groq ${upstream.status}: ${JSON.stringify(upstream.data)}` });
		}
		res.status(500).json({ message: error.message });
	}
};

// ─── POST /api/ai/aar ─────────────────────────────────────────────────────────
// Body:
//   systemPrompt — string
//   userContent  — string

exports.generateAAR = async (req, res) => {
	try {
		const { systemPrompt, userContent } = req.body;

		if (!systemPrompt || !userContent) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const key = process.env.GROQ_KEY;
		if (!key) {
			return res.status(500).json({ message: "AI service not configured on server" });
		}

		const groqRes = await axios.post(
			GROQ_URL,
			{
				model:       MODEL,
				max_tokens:  600,
				temperature: 0.4,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user",   content: userContent  },
				],
			},
			{
				headers: {
					Authorization:  `Bearer ${key}`,
					"Content-Type": "application/json",
				},
			},
		);

		const text = groqRes.data.choices?.[0]?.message?.content?.trim() ?? "";
		res.status(200).json({ text });
	} catch (error) {
		console.error("AAR generation error:", error.message);
		const upstream = error.response;
		if (upstream) {
			return res
				.status(upstream.status)
				.json({ message: `Groq ${upstream.status}: ${JSON.stringify(upstream.data)}` });
		}
		res.status(500).json({ message: error.message });
	}
};
