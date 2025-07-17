const Infirmary = require("../models/Infirmary");
const Operator = require("../models/Operator");
const {
	EventBridgeClient,
	PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

// Initialize AWS EventBridge Client
const eventBridge = new EventBridgeClient({ region: "us-east-1" }); // Update with your region

const EVENT_BUS_NAME = "default"; // Change if using a custom event bus

// Function to send event to AWS EventBridge
const triggerOperatorRecovery = async (operatorId) => {
	try {
		const command = new PutEventsCommand({
			Entries: [
				{
					Source: "ghostopsai.operators",
					DetailType: "OperatorInjured",
					Detail: JSON.stringify({ operator_id: operatorId }),
					EventBusName: EVENT_BUS_NAME,
				},
			],
		});

		await eventBridge.send(command);
		console.log(`Event sent for Operator ${operatorId}`);
	} catch (error) {
		console.error("Failed to send event to EventBridge:", error);
	}
};
async function sendRecoveryEvent(operatorId) {
	try {
		const command = new PutEventsCommand({
			Entries: [
				{
					Source: "ghostopsai.operators",
					DetailType: "OperatorRecovered",
					Detail: JSON.stringify({ operator_id: operatorId }),
					EventBusName: "default",
				},
			],
		});

		await eventBridge.send(command);
		console.log(`Event sent: OperatorRecovered for ${operatorId}`);
	} catch (error) {
		console.error("Failed to send EventBridge event:", error);
	}
}

//POST Operator to Infirmary
exports.addInjuredOperator = async (req, res) => {
	try {
		//Cognito User ID
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		//Check if Operator Exists
		const operator = await Operator.findOne({
			_id: req.body.operator,
			createdBy: userId,
		});
		if (!operator) {
			return res
				.status(404)
				.json({ message: "Operator not found or unauthorized" });
		}

		//POST
		const injuredOperator = new Infirmary({
			createdBy: userId,
			operator: req.body.operator,
			injuryType: req.body.injuryType,
			recoveryHours: req.body.recoveryHours,
		});

		await injuredOperator.save();
		console.log("Operator Added to Infirmary:", injuredOperator);

		// Trigger AWS EventBridge to Start Step Functions
		await triggerOperatorRecovery(req.body.operator);

		res.status(201).json({
			message: "Operator added to infirmary successfully!",
			injuredOperator,
		});
	} catch (error) {
		console.error("Error Adding Operator to Infirmary:", error.message);
		res.status(400).json({ error: error.message });
	}
};

// GET All Injured Operators
exports.getInjuredOperators = async (req, res) => {
	try {
		const userId = req.userId;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}
		const infirmaryList = await Infirmary.find({ createdBy: userId }).populate(
			"operator"
		);

		res.status(200).json(infirmaryList);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

//GET a Single Injured Operator by ID
exports.getInjuredOperatorById = async (req, res) => {
	try {
		const userId = req.userId;
		const infirmaryId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const injuredOperator = await Infirmary.findOne({
			_id: infirmaryId,
			createdBy: userId,
		}).populate("operator");
		if (!injuredOperator) {
			return res
				.status(404)
				.json({ message: "Injured Operator not found or unauthorized" });
		}

		res.status(200).json(injuredOperator);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

//UPDATE an Injury
exports.updateInjury = async (req, res) => {
	try {
		const userId = req.userId;
		const infirmaryId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const updatedInjury = await Infirmary.findOneAndUpdate(
			{ _id: infirmaryId, createdBy: userId },
			req.body,
			{ new: true, runValidators: true }
		).populate("operator");

		if (!updatedInjury) {
			return res
				.status(404)
				.json({ message: "Injured Operator not found or unauthorized" });
		}

		//Send Recovery Event to AWS EventBridge with Execution ARN
		if (updatedInjury.executionArn) {
			await sendRecoveryEvent(
				updatedInjury.operator._id,
				updatedInjury.executionArn
			);
		}
		res
			.status(200)
			.json({ message: "Injury updated successfully!", updatedInjury });
	} catch (error) {
		console.error("Error Updating Injury:", error.message);
		res.status(400).json({ error: error.message });
	}
};

//DELETE an Operator from the Infirmary
exports.removeInjuredOperator = async (req, res) => {
	try {
		const userId = req.userId;
		const infirmaryId = req.params.id;

		if (!userId) {
			return res.status(401).json({ message: "Unauthorized: No User ID" });
		}

		const deletedOperator = await Infirmary.findOneAndDelete({
			_id: infirmaryId,
			createdBy: userId,
		});

		if (!deletedOperator) {
			return res
				.status(404)
				.json({ message: "Injured Operator not found or unauthorized" });
		}
		res
			.status(200)
			.json({ message: "Operator removed from infirmary successfully!" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
