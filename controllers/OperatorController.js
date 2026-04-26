const Operator = require("../models/Operator");
const { deleteImageFromS3 } = require("../utils/S3utils");

// ── POST /api/operators ───────────────────────────────────────
exports.createOperator = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId)
			return res.status(401).json({ message: "Unauthorized: No User ID" });

		const operator = new Operator({
			createdBy: userId,
			callSign: req.body.callSign,
			image: req.body.image || "/ghost/Default.png",
			class: req.body.class,
			role: req.body.role,
						imageKey: req.body.imageKey,
			weaponType: req.body.weaponType,
			weapon: req.body.weapon,
			sideArm: req.body.sideArm,
			items: req.body.items,
			perks: req.body.perks, // ← was copying items by mistake
		});

		await operator.save();
		res
			.status(201)
			.json({ message: "Operator created successfully!", operator });
	} catch (error) {
		console.error("Error Creating Operator:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// ── GET /api/operators ────────────────────────────────────────
exports.getOperators = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId)
			return res.status(401).json({ message: "Unauthorized: No User ID" });

		// Populate squad so frontend gets { _id, name } instead of bare ObjectId
		const operators = await Operator.find({ createdBy: userId });
		res.status(200).json(operators);
	} catch (error) {
		console.error("Error Fetching Operators:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// ── GET /api/operators/:id ────────────────────────────────────
exports.getOperatorById = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const operator = await Operator.findOne({
			_id: req.params.id,
			createdBy: req.userId,
		});

		if (!operator)
			return res.status(404).json({ message: "Operator not found" });

		res.status(200).json(operator);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

// ── PUT /api/operators/:id ────────────────────────────────────
exports.updateOperator = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const operator = await Operator.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true },
		);

		if (!operator)
			return res
				.status(404)
				.json({ message: "Operator not found or unauthorized" });

		res.status(200).json({ message: "Operator updated!", operator });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

// ── DELETE /api/operators/:id ─────────────────────────────────
exports.deleteOperator = async (req, res) => {
	try {
		const userId = req.userId;
		if (!userId) return res.status(401).json({ message: "Unauthorized" });

		const operator = await Operator.findOneAndDelete({
			_id: req.params.id,
			createdBy: userId,
		});

		if (!operator)
			return res
				.status(404)
				.json({ message: "Operator not found or unauthorized" });

		if (operator.imageKey) {
			await deleteImageFromS3(operator.imageKey);
		}

		res.status(200).json({ message: "Operator deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Operator:", error.message);
		res.status(500).json({ error: error.message });
	}
};
