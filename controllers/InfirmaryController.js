const Infirmary = require("../models/Infirmary");
const Operator = require("../models/Operator");

//POST Operator to Infirmary
exports.addInjuredOperator = async (req, res) => {
  try {
    //Cognito User ID
    const userId = req.userId;
    console.log(`Incoming CREATE Request for Infirmary`);
    console.log(`Request from User: ${userId}`);
    console.log("Injury Data:", req.body);

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
      recoveryDays: req.body.recoveryDays,
    });

    await injuredOperator.save();
    console.log("Operator Added to Infirmary:", injuredOperator);

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
    console.log(
      `Incoming GET Request for Infirmary Operators from User: ${userId}`
    );

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const infirmaryList = await Infirmary.find({ createdBy: userId }).populate(
      "operator"
    );
    console.log("Retrieved Injured Operators:", infirmaryList);
    res.status(200).json(infirmaryList);
  } catch (error) {
    console.error("Error Fetching Infirmary Data:", error.message);
    res.status(500).json({ error: error.message });
  }
};

//GET a Single Injured Operator by ID
exports.getInjuredOperatorById = async (req, res) => {
  try {
    const userId = req.userId;
    const infirmaryId = req.params.id;
    console.log(`Incoming GET Request for Injured Operator ID: ${infirmaryId}`);

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
    console.error("Error Fetching Injured Operator:", error.message);
    res.status(500).json({ error: error.message });
  }
};

//UPDATE an Injury
exports.updateInjury = async (req, res) => {
  try {
    const userId = req.userId;
    const infirmaryId = req.params.id;
    console.log(`Incoming UPDATE Request for Injury ID: ${infirmaryId}`);
    console.log("Updated Data:", req.body);

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

    console.log("Injury Updated:", updatedInjury);
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
    console.log(
      `Incoming DELETE Request for Injured Operator ID: ${infirmaryId}`
    );

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

    console.log("Operator Removed from Infirmary:", deletedOperator);
    res
      .status(200)
      .json({ message: "Operator removed from infirmary successfully!" });
  } catch (error) {
    console.error("Error Removing Operator from Infirmary:", error.message);
    res.status(500).json({ error: error.message });
  }
};
