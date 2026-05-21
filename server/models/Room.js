const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    sensorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sensor",
      default: null,
    },
    geometry: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
      width: { type: Number, default: 150 },
      height: { type: Number, default: 100 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);