const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

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
    webhookSlug: {
      type: String,
      unique: true,
      default: () => nanoid(12),
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sensor", sensorSchema);