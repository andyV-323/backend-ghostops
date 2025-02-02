const Operator = require("../models/Operator");

//POST a New Operator
exports.createOperator = async (req, res) => {
  try {
    console.log("Received Request to Create Operator");
    console.log("Request Body:", req.body);
    console.log("Headers:", req.headers);

    if (!req.userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No Token Provided" });
    }

    const operator = new Operator({
      ...req.body,
      createdBy: req.userId,
    });

    await operator.save();
    console.log("Operator Saved:", operator);

    res.status(201).json({
      message: "Operator created successfully!",
      operator,
    });
  } catch (error) {
    console.error("Error Creating Operator:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// GET All Operators by Cognito User
exports.getOperators = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const operators = await Operator.find({ createdBy: req.userId });
    res.status(200).json(operators);
  } catch (error) {
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

    console.log(`Incoming DELETE Request for Operator ID: ${operatorId}`);
    console.log(` Request from User: ${userId}`);

    if (!userId) {
      console.log("Unauthorized Request (No User ID)");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const operator = await Operator.findOneAndDelete({
      _id: operatorId,
      createdBy: userId,
    });

    if (!operator) {
      console.log(`Operator Not Found or Unauthorized: ${operatorId}`);
      return res
        .status(404)
        .json({ message: "Operator not found or unauthorized" });
    }

    console.log("Operator Successfully Deleted:", operator);
    res.status(200).json({ message: "Operator deleted successfully!" });
  } catch (error) {
    console.error("Error Deleting Operator:", error.message);
    res.status(500).json({ error: error.message });
  }
};
