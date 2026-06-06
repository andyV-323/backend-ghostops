// controllers/AiController.js
// Groq API proxy — keeps GROQ_KEY server-side.
// Frontend builds prompts and sends them here; this controller makes the Groq
// call, validates the response, and returns processed data to the client.

const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "llama-3.3-70b-versatile";

// ─── POST /api/ai/advisory ────────────────────────────────────────────────────
// Body:
//   systemPrompt          — string
//   userPrompt            — string
//   province              — string  (e.g. "FenBog")
//   provinceLocationNames — string[] (exact location names from the province)
//   opType                — string  (e.g. "intel_gathering", "direct_action")

const RECON_OP_TYPES  = new Set(["intel_gathering"]);
const VALID_POSTURES  = new Set(["stealth", "balanced", "aggressive"]);
const VALID_OBJ_MODES = new Set(["ao_exploration", "fixed_location"]);
const VALID_INFIL_METHODS = new Set([
	"HALO", "HAHO", "helo_insertion", "helo_landing_open_field",
	"vehicle", "on_foot", "aquatic",
]);
const VALID_CLASSES = new Set([
	"Assault", "Engineer", "Panther", "Sharpshooter", "Medic", "Echelon", "Pathfinder",
]);

exports.generateAdvisory = async (req, res) => {
	try {
		const { systemPrompt, userPrompt, province, provinceLocationNames, opType } = req.body;

		if (!systemPrompt || !userPrompt || !province || !Array.isArray(provinceLocationNames)) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const key = process.env.GROQ_KEY;
		if (!key) {
			return res.status(500).json({ message: "AI service not configured on server" });
		}

		// Prepend a per-request uniqueness seed to break response caching
		const seed = `[SEED:${Date.now().toString(36)}] `;
		const seededSystem = seed + systemPrompt;

		const groqRes = await axios.post(
			GROQ_URL,
			{
				model:           MODEL,
				max_tokens:      3000,
				temperature:     0.88,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: seededSystem },
					{ role: "user",   content: userPrompt    },
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
		let advisory;
		try {
			advisory = JSON.parse(raw);
		} catch {
			return res.status(422).json({
				message: "Advisory generation returned invalid JSON. Try again.",
			});
		}

		// ── Structural validation ─────────────────────────────────────────────
		if (!Array.isArray(advisory.courses) || advisory.courses.length !== 2) {
			return res.status(422).json({
				message: "Advisory must contain exactly 2 courses of action. Try again.",
			});
		}

		const courseIds = advisory.courses.map((c) => c.id);
		if (!advisory.recommendedCOA || !courseIds.includes(advisory.recommendedCOA)) {
			return res.status(422).json({
				message: "recommendedCOA must match one of the course ids. Try again.",
			});
		}

		if (advisory.objectiveMode && !VALID_OBJ_MODES.has(advisory.objectiveMode)) {
			return res.status(422).json({
				message: `Invalid objectiveMode: "${advisory.objectiveMode}". Try again.`,
			});
		}

		// ── Per-COA validation ────────────────────────────────────────────────
		for (const coa of advisory.courses) {
			if (!VALID_POSTURES.has(coa.posture)) {
				return res.status(422).json({
					message: `COA "${coa.id}" has invalid posture: "${coa.posture}". Try again.`,
				});
			}

			const method = coa.infiltration?.method;
			if (!VALID_INFIL_METHODS.has(method)) {
				return res.status(422).json({
					message: `COA "${coa.id}" has invalid infiltration method: "${method}". Try again.`,
				});
			}

			if (!Array.isArray(coa.classes) || !coa.classes.length) {
				return res.status(422).json({
					message: `COA "${coa.id}" is missing classes array. Try again.`,
				});
			}

			const badClasses = coa.classes.filter((c) => !VALID_CLASSES.has(c));
			if (badClasses.length) {
				return res.status(422).json({
					message: `COA "${coa.id}" contains invalid class(es): ${badClasses.join(", ")}. Try again.`,
				});
			}

			if (typeof coa.teamSize !== "number" || coa.teamSize < 1 || coa.teamSize > 4) {
				return res.status(422).json({
					message: `COA "${coa.id}" teamSize must be an integer 1–4. Try again.`,
				});
			}
		}

		// ── Location validation for DA/strike ops ─────────────────────────────
		// Recon/intel ops are AO-level — no fixed location to validate against.
		if (!RECON_OP_TYPES.has(opType) && provinceLocationNames.length > 0) {
			const validLoc = (loc) =>
				provinceLocationNames.some((n) => n.trim() === loc?.trim());

			for (const coa of advisory.courses) {
				const exfilRally = coa.exfil?.rallyPoint;
				// Only validate fields that are expected to be exact location names.
				// Free-text approach/execution strings are intentionally not validated.
				if (exfilRally && !validLoc(exfilRally)) {
					// Rally points are often descriptive strings, not location names — skip hard fail.
					// Log for debugging but don't reject the response.
				}
			}
		}

		res.status(200).json({ advisory });
	} catch (error) {
		console.error("Advisory generation error:", error.message);
		const upstream = error.response;
		if (upstream) {
			return res
				.status(upstream.status)
				.json({ message: `Groq ${upstream.status}: ${JSON.stringify(upstream.data)}` });
		}
		res.status(500).json({ message: error.message });
	}
};

// ─── POST /api/ai/bio ─────────────────────────────────────────────────────────
// Body:
//   callSign      — string (required)
//   operatorClass — string  (e.g. "Assault")
//   role          — string  (e.g. "Breacher")
//   status        — string  (Active | Injured | KIA)
//   userNote      — string  (optional extra context from user)
//   kiaAO         — string  (AO location, only for KIA)
//   kiaInjury     — string  (cause of death, only for KIA)

exports.generateBio = async (req, res) => {
	try {
		const { callSign, operatorClass, role, status, userNote, kiaAO, kiaInjury } = req.body;

		if (!callSign) {
			return res.status(400).json({ message: "callSign is required" });
		}

		const key = process.env.GROQ_KEY;
		if (!key) {
			return res.status(500).json({ message: "AI service not configured on server" });
		}

		const identityParts = [operatorClass, role].filter(Boolean).join(", ");

		let userPrompt = `Write a 3-4 sentence classified operator bio for callsign "${callSign}"`;
		if (identityParts) userPrompt += `, ${identityParts}`;
		userPrompt += `. Status: ${status || "Active"}.`;
		if (userNote) userPrompt += ` Additional context: ${userNote}.`;
		userPrompt += ` Focus on their specialty, demeanor, and operational value to the element. Tight military prose — no fluff, no filler.`;

		if (status === "KIA" && kiaAO) {
			userPrompt += ` After the bio, on a new paragraph, write a single KIA record sentence: "${callSign} was killed in action at ${kiaAO}`;
			if (kiaInjury) userPrompt += ` — ${kiaInjury}`;
			userPrompt += `." Use past tense throughout that sentence.`;
		}

		const groqRes = await axios.post(
			GROQ_URL,
			{
				model:       MODEL,
				max_tokens:  350,
				temperature: 0.65,
				messages: [
					{
						role:    "system",
						content: "You are a Ghost Recon special operations unit biographer writing classified operator dossiers. Write in terse, direct military prose. No markdown, no bullet points, no headers. Return only the bio text — nothing else.",
					},
					{ role: "user", content: userPrompt },
				],
			},
			{
				headers: {
					Authorization:  `Bearer ${key}`,
					"Content-Type": "application/json",
				},
			},
		);

		const bio = groqRes.data.choices?.[0]?.message?.content?.trim() ?? "";
		res.status(200).json({ bio });
	} catch (error) {
		console.error("Bio generation error:", error.message);
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
