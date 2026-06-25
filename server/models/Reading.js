const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema({
  sensorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sensor",
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  totalIn: { type: Number, default: 0 },
  totalOut: { type: Number, default: 0 },
  periodIn: { type: Number, default: 0 },
  periodOut: { type: Number, default: 0 },
  occupancy: { type: Number, default: 0 },
});

readingSchema.index({ sensorId: 1, timestamp: -1 });
readingSchema.index({ roomId: 1, timestamp: -1 });

module.exports = mongoose.model("Reading", readingSchema);