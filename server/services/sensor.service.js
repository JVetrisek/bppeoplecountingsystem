const Room = require("../models/room");

async function formatSensor(sensor) {
  const obj = sensor.toObject ? sensor.toObject() : sensor;

  let room = null;
  if (obj.roomId) {
    const roomDoc =
      typeof obj.roomId === "object" && obj.roomId.name
        ? obj.roomId
        : await Room.findById(obj.roomId).select("name");
    if (roomDoc) {
      room = { id: roomDoc._id, name: roomDoc.name };
    }
  }

  return {
    id: obj._id,
    name: obj.name,
    devEui: obj.devEui,
    lastSeenAt: obj.lastSeenAt,
    isActive: obj.isActive,
    room,
  };
}

async function formatSensors(sensors) {
  return Promise.all(sensors.map(formatSensor));
}

module.exports = { formatSensor, formatSensors };
