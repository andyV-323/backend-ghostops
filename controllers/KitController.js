const Kit = require("../models/Kit");

// ── POST /api/kits ────────────────────────────────────────────
exports.createKit = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) return res.status(401).json({ message: "Unauthorized" });

		const kit = new Kit({
			createdBy: userId,
			name:      req.body.name,
			type:      req.body.type      || "specialty",
			primary:   req.body.primary   || {},
			secondary: req.body.secondary || {},
			handgun:   req.body.handgun   || {},
			items:     req.body.items     || [],
			perks:     req.body.perks     || [],
		});

		await kit.save();
		res.status(201).json({ message: "Kit created!", kit });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// ── GET /api/kits ─────────────────────────────────────────────
exports.getKits = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) return res.status(401).json({ message: "Unauthorized" });

		const kits = await Kit.find({ createdBy: userId });
		res.status(200).json(kits);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ── PUT /api/kits/:id ─────────────────────────────────────────
exports.updateKit = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const kit = await Kit.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true },
		);

		if (!kit)
			return res.status(404).json({ message: "Kit not found or unauthorized" });

		res.status(200).json({ message: "Kit updated!", kit });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// ── DELETE /api/kits/:id ──────────────────────────────────────
exports.deleteKit = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const kit = await Kit.findOneAndDelete({
			_id: req.params.id,
			createdBy: req.userId,
		});

		if (!kit)
			return res.status(404).json({ message: "Kit not found or unauthorized" });

		res.status(200).json({ message: "Kit deleted!" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
