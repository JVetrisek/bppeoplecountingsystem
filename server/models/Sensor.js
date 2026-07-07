const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    devEui: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sensor", sensorSchema);
