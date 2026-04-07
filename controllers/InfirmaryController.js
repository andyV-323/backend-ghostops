const Infirmary = require("../models/Infirmary");
const Operator = require("../models/Operator");
const {
	EventBridgeClient,
	PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const eventBridge = new EventBridgeClient({ region: "us-east-1" });
const EVENT_BUS_NAME = "default";

// ─── EventBridge Helpers ───────────────────────────────────────────────────

// Fires when an operator is injured — starts recovery Step Function
const triggerOperatorRecovery = async (operatorId) => {
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

	const result = await eventBridge.send(command);

	// EventBridge can partially fail even with a 200 response — always check this
	if (result.FailedEntryCount > 0) {
		const failed = result.Entries.find((e) => e.ErrorCode);
		throw new Error(
			`EventBridge rejected event: ${failed?.ErrorCode} — ${failed?.ErrorMessage}`,
		);
	}

	console.log(`[EventBridge] OperatorInjured event sent for ${operatorId}`);
};

// Fires when an operator has recovered — stops Step Function execution
const sendRecoveryEvent = async (operatorId) => {
	const command = new PutEventsCommand({
		Entries: [
			{
				Source: "ghostopsai.operators",
				DetailType: "OperatorRecovered",
				Detail: JSON.stringify({ operator_id: operatorId }),
				EventBusName: EVENT_BUS_NAME,
			},
		],
	});

	const result = await eventBridge.send(command);

	if (result.FailedEntryCount > 0) {
		const failed = result.Entries.find((e) => e.ErrorCode);
		throw new Error(
			`EventBridge rejected event: ${failed?.ErrorCode} — ${failed?.ErrorMessage}`,
		);
	}

	console.log(`[EventBridge] OperatorRecovered event sent for ${operatorId}`);
};

// ─── Controllers ──────────────────────────────────────────────────────────

// POST — Add operator to infirmary and start recovery timer
exports.addInjuredOperator = async (req, res) => {
	const userId = req.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	let injuredOperator = null;

	try {
		// Verify operator exists and belongs to this user
		const operator = await Operator.findOne({
			_id: req.body.operator,
			createdBy: userId,
		});

		if (!operator) {
			return res
				.status(404)
				.json({ message: "Operator not found or unauthorized" });
		}

		// Save to infirmary first
		injuredOperator = new Infirmary({
			createdBy: userId,
			operator: req.body.operator,
			injuryType: req.body.injuryType,
			recoveryHours: req.body.recoveryHours,
		});

		await injuredOperator.save();
		console.log("[Infirmary] Operator added:", injuredOperator._id);

		// Trigger recovery Step Function — if this fails we roll back
		await triggerOperatorRecovery(req.body.operator);

		return res.status(201).json({
			message: "Operator added to infirmary successfully!",
			injuredOperator,
		});
	} catch (error) {
		console.error("[Infirmary] Error in addInjuredOperator:", error.message);

		// Rollback — remove infirmary record if EventBridge failed
		// Prevents operator being stuck in infirmary with no recovery timer running
		if (injuredOperator?._id) {
			try {
				await Infirmary.findByIdAndDelete(injuredOperator._id);
				console.log(
					"[Infirmary] Rolled back infirmary record:",
					injuredOperator._id,
				);
			} catch (rollbackError) {
				// Log but don't mask the original error
				console.error("[Infirmary] Rollback failed:", rollbackError.message);
			}
		}

		return res.status(500).json({
			error: "Failed to start operator recovery. Please try again.",
			detail: error.message,
		});
	}
};

// GET — All injured operators for this user
exports.getInjuredOperators = async (req, res) => {
	const userId = req.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const infirmaryList = await Infirmary.find({ createdBy: userId }).populate(
			"operator",
		);
		return res.status(200).json(infirmaryList);
	} catch (error) {
		console.error("[Infirmary] Error fetching operators:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// GET — Single injured operator by ID
exports.getInjuredOperatorById = async (req, res) => {
	const userId = req.userId;
	const infirmaryId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const injuredOperator = await Infirmary.findOne({
			_id: infirmaryId,
			createdBy: userId,
		}).populate("operator");

		if (!injuredOperator) {
			return res
				.status(404)
				.json({ message: "Injured operator not found or unauthorized" });
		}

		return res.status(200).json(injuredOperator);
	} catch (error) {
		console.error("[Infirmary] Error fetching operator:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

// PUT — Update injury record (e.g. mark recovered)
exports.updateInjury = async (req, res) => {
	const userId = req.userId;
	const infirmaryId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const updatedInjury = await Infirmary.findOneAndUpdate(
			{ _id: infirmaryId, createdBy: userId },
			req.body,
			{ new: true, runValidators: true },
		).populate("operator");

		if (!updatedInjury) {
			return res
				.status(404)
				.json({ message: "Injured operator not found or unauthorized" });
		}

		// Send OperatorRecovered event if execution ARN exists
		// Non-fatal — log the error but don't fail the update
		if (updatedInjury.executionArn) {
			try {
				await sendRecoveryEvent(updatedInjury.operator._id);
			} catch (eventError) {
				console.error(
					"[Infirmary] Recovery event failed (non-fatal):",
					eventError.message,
				);
			}
		}

		return res
			.status(200)
			.json({ message: "Injury updated successfully!", updatedInjury });
	} catch (error) {
		console.error("[Infirmary] Error updating injury:", error.message);
		return res.status(400).json({ error: error.message });
	}
};

// DELETE — Remove operator from infirmary
exports.removeInjuredOperator = async (req, res) => {
	const userId = req.userId;
	const infirmaryId = req.params.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized: No User ID" });
	}

	try {
		const deletedOperator = await Infirmary.findOneAndDelete({
			_id: infirmaryId,
			createdBy: userId,
		});

		if (!deletedOperator) {
			return res
				.status(404)
				.json({ message: "Injured operator not found or unauthorized" });
		}

		return res
			.status(200)
			.json({ message: "Operator removed from infirmary successfully!" });
	} catch (error) {
		console.error("[Infirmary] Error removing operator:", error.message);
		return res.status(500).json({ error: error.message });
	}
};
