const Team = require("../models/Team");
const Operator = require("../models/Operator");

// CREATE a new Team
exports.createTeam = async (req, res) => {
  try {
    //Cognito User ID
    const userId = req.userId;
    console.log(`Incoming CREATE Request for Team`);
    console.log(`Request from User: ${userId}`);
    console.log("Team Data:", req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const team = new Team({
      createdBy: userId,
      name: req.body.name,
      operators: req.body.operators || [],
    });

    await team.save();
    console.log("Team Created:", team);
    res.status(201).json({ message: "Team created successfully!", team });
  } catch (error) {
    console.error("Error Creating Team:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// GET all teams for the logged-in user
exports.getTeams = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`Incoming GET Request for Teams from User: ${userId}`);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const teams = await Team.find({ createdBy: userId }).populate("operators");
    res.status(200).json(teams);
  } catch (error) {
    console.error("Error Fetching Teams:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET a single team by ID
exports.getTeamById = async (req, res) => {
  try {
    const userId = req.userId;
    const teamId = req.params.id;
    console.log(`Incoming GET Request for Team ID: ${teamId}`);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const team = await Team.findOne({
      _id: teamId,
      createdBy: userId,
    }).populate("operators");
    if (!team) {
      return res
        .status(404)
        .json({ message: "Team not found or unauthorized" });
    }

    res.status(200).json(team);
  } catch (error) {
    console.error("Error Fetching Team:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE a Team
exports.updateTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const teamId = req.params.id;
    console.log(`Incoming UPDATE Request for Team ID: ${teamId}`);
    console.log("Updated Data:", req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const team = await Team.findOneAndUpdate(
      { _id: teamId, createdBy: userId },
      req.body,
      { new: true, runValidators: true }
    ).populate("operators");

    if (!team) {
      return res
        .status(404)
        .json({ message: "Team not found or unauthorized" });
    }

    console.log("Team Updated:", team);
    res.status(200).json({ message: "Team updated successfully!", team });
  } catch (error) {
    console.error("Error Updating Team:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// DELETE a Team
exports.deleteTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const teamId = req.params.id;
    console.log(`Incoming DELETE Request for Team ID: ${teamId}`);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No User ID" });
    }

    const team = await Team.findOneAndDelete({
      _id: teamId,
      createdBy: userId,
    });

    if (!team) {
      return res
        .status(404)
        .json({ message: "Team not found or unauthorized" });
    }

    console.log("Team Deleted:", team);
    res.status(200).json({ message: "Team deleted successfully!" });
  } catch (error) {
    console.error("Error Deleting Team:", error.message);
    res.status(500).json({ error: error.message });
  }
};
