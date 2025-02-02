const Memorial = require("../models/Memorial");
const Operator = require("../models/Operator");

//POST Operator to Memorial
exports.addToMemorial = async (req, res) => {
  try {
    //Cognito User ID
    const userId = req.userId;
    console.log(`Incoming CREATE Request for Memorial`);
    console.log(`Request from User: ${userId}`);
    console.log("Memorial Data:", req.body);

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

    //POST Operator to Memorial
    const memorialEntry = new Memorial({
      createdBy: userId,
      operator: req.body.operator,
      name: req.body.name,
      dateOfDeath: req.body.dateOfDeath || Date.now(),
    });

    await memorialEntry.save();
    console.log("Operator Added to Memorial:", memorialEntry);

    res.status(201).json({
      message: "Operator added to memorial successfully!",
      memorialEntry,
    });
  } catch (error) {
    console.error("Error Adding Operator to Memorial:", error.message);
    res.status(400).json({ error: error.message });
  }
};

//GET All Memorialized Operators
exports.getMemorializedOperators = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(
      `Incoming GET Request for Memorialized Operators from User: ${userId}`
    );

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const memorialList = await Memorial.find({ createdBy: userId }).populate(
      "operator"
    );
    console.log("Retrieved Memorialized Operators:", memorialList);
    res.status(200).json(memorialList);
  } catch (error) {
    console.error("Error Fetching Memorial Data:", error.message);
    res.status(500).json({ error: error.message });
  }
};

//GET a Single Memorialized Operator by ID
exports.getMemorializedOperatorById = async (req, res) => {
  try {
    const userId = req.userId;
    const memorialId = req.params.id;
    console.log(`Incoming GET Request for Memorial Operator ID: ${memorialId}`);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const memorializedOperator = await Memorial.findOne({
      _id: memorialId,
      createdBy: userId,
    }).populate("operator");
    if (!memorializedOperator) {
      return res
        .status(404)
        .json({ message: "Memorialized Operator not found or unauthorized" });
    }

    res.status(200).json(memorializedOperator);
  } catch (error) {
    console.error("Error Fetching Memorialized Operator:", error.message);
    res.status(500).json({ error: error.message });
  }
};

//DELETE an Operator from the Memorial
exports.removeFromMemorial = async (req, res) => {
  try {
    const userId = req.userId;
    const memorialId = req.params.id;
    console.log(
      `Incoming DELETE Request for Memorial Operator ID: ${memorialId}`
    );

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const deletedOperator = await Memorial.findOneAndDelete({
      _id: memorialId,
      createdBy: userId,
    });

    if (!deletedOperator) {
      return res
        .status(404)
        .json({ message: "Memorialized Operator not found or unauthorized" });
    }

    console.log("Operator Removed from Memorial:", deletedOperator);
    res
      .status(200)
      .json({ message: "Operator removed from memorial successfully!" });
  } catch (error) {
    console.error("Error Removing Operator from Memorial:", error.message);
    res.status(500).json({ error: error.message });
  }
};
