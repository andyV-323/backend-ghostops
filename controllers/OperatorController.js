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
			name: req.body.name,
			callSign: req.body.callSign,
			sf: req.body.sf,
			nationality: req.body.nationality,
			image: req.body.image || "/ghost/Default.png",
			class: req.body.class,
			rank: req.body.rank,
			gear: req.body.gear.startsWith("/gear/")
				? req.body.gear
				: "/gear/default.png",
			secondaryClass: req.body.secondaryClass,
			secondaryGear: req.body.secondaryGear.startsWith("/gear/")
				? req.body.secondaryGear
				: "/gear/default.png",

			primaryWeapon1: req.body.primaryWeapon1.startsWith("/icons/")
				? req.body.primaryWeapon1
				: "/icons/empty.svg",
			primaryname: req.body.primaryname || null,
			sidearm1: req.body.sidearm1 || null,
			secondaryWeapon1: req.body.secondaryWeapon1.startsWith("/icons/")
				? req.body.secondaryWeapon1
				: "/icons/empty.svg",
			secondaryname: req.body.secondaryname || null,

			primaryWeapon2: req.body.primaryWeapon2.startsWith("/icons/")
				? req.body.primaryWeapon2
				: "/icons/empty.svg",
			primaryname2: req.body.primaryname2 || null,
			sidearm2: req.body.sidearm2 || null,
			secondaryWeapon2: req.body.secondaryWeapon2.startsWith("/icons/")
				? req.body.secondaryWeapon2
				: "/icons/empty.svg",
			secondaryname2: req.body.secondaryname2 || null,

			bio: req.body.bio || "null",
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
