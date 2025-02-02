const mongoose = require("mongoose");

const missionSchema = mongoose.Schema({
  //Cognito user
  createdBy: { type: String, required: true },
  name: { type: String, required: true },
  wasSuccessful: { type: Boolean, required: true },
  kiaCount: { type: Number, required: true, default: 0 },
  injuredCount: { type: Number, required: true, default: 0 },
  assignedTeams: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: [] },
  ],
  roles: { type: Map, of: String, default: {} },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Mission", missionSchema);
