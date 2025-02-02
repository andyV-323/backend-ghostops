const mongoose = require("mongoose");

const weaponTypes = [
  "Assault Rifle",
  "Designated Marksman Rifle",
  "Grenade Launcher",
  "Light Machine Gun",
  "Sub Machine Gun",
  "Sniper Rifle",
  "Shot Gun",
];

//Ensure class roles are correctly stored
const classRoles = {
  Assault: ["Weapons Specialist", "Grenadier", "Breacher", "Support Gunner"],
  Sharpshooter: ["Sniper", "Designated Marksman"],
  Medic: ["Field Medic", "Combat Medic"],
  Engineer: ["Explosives Specialist", "Drone Operator"],
  Echelon: ["SIGINT Specialist", "Electronic Warfare Operator"],
  Pathfinder: ["Scout", "Tracker", "JTAC"],
  Panther: ["CQB Specialist", "Reconnaissance Scout"],
};

//Get only the class names as valid options
const classNames = Object.keys(classRoles);

const operatorSchema = new mongoose.Schema({
  //cognito user
  createdBy: { type: String, required: true },
  name: { type: String, required: true },
  callSign: { type: String, default: null },
  rank: { type: String, default: null },
  class: {
    type: String,
    enum: classNames,
    required: true,
  },
  role: {
    type: String,
    required: true,
    validate: {
      validator: function (role) {
        //Ensures role matches a valid role for the selected class (case insensitive)
        return classRoles[this.class]?.some(
          (validRole) => validRole.toLowerCase() === role.toLowerCase()
        );
      },
      message: (props) =>
        `"${props.value}" is not a valid role for the class: ${props.instance.class}.`,
    },
  },
  secondaryClass: {
    type: String,
    enum: classNames,
    default: null,
  },
  secondaryRole: { type: String, default: null },
  skills: { type: [String], default: [] },
  status: {
    type: String,
    enum: ["Active", "Injured", "KIA"],
    default: "Active",
  },
  primaryWeapon1: {
    type: String,
    enum: weaponTypes,
    default: null,
  },
  sidearm1: { type: String, default: null },
  secondaryWeapon1: {
    type: String,
    enum: weaponTypes,
    default: null,
  },
  primaryWeapon2: {
    type: String,
    enum: weaponTypes,
    default: null,
  },
  sidearm2: { type: String, default: null },
  secondaryWeapon2: {
    type: String,
    enum: weaponTypes,
    default: null,
  },
});

module.exports = mongoose.model("Operator", operatorSchema);
