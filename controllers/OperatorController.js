const Operator = require("../models/Operator");

// POST a New Operator
exports.createOperator = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}
		const operatorData = {
			createdBy: userId,
			callSign: req.body.callSign,
			image: req.body.image || "/ghost/Default.png",
			class: req.body.class,
			support: req.body.support,
			role: req.body.role,
			aviator: req.body.aviator,
		};

		//Create new operator using validated data
		const operator = new Operator(operatorData);

		await operator.save();
		res
			.status(201)
			.json({ message: "Operator created successfully!", operator });
	} catch (error) {
		console.error("Error Creating Operator:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// GET All Operators by Cognito User
exports.getOperators = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		//Only return operators created by the logged-in user
		const operators = await Operator.find({ createdBy: userId });

		res.status(200).json(operators);
	} catch (error) {
		console.error("Error Fetching Operators:", error.message);
		res.status(500).json({ error: error.message });
	}
};

// GET a Single Operator by ID
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

// UPDATE Operator
exports.updateOperator = async (req, res) => {
	try {
		if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

		const operator = await Operator.findOneAndUpdate(
			{ _id: req.params.id, createdBy: req.userId },
			req.body,
			{ new: true }
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

//DELETE Operator
exports.deleteOperator = async (req, res) => {
	try {
		const userId = req.userId;
		const operatorId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const operator = await Operator.findOneAndDelete({
			_id: operatorId,
			createdBy: userId,
		});

		if (!operator) {
			return res
				.status(404)
				.json({ message: "Operator not found or unauthorized" });
		}

		res.status(200).json({ message: "Operator deleted successfully!" });
	} catch (error) {
		console.error("Error Deleting Operator:", error.message);
		res.status(500).json({ error: error.message });
	}
};
