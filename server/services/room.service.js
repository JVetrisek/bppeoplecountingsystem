const Reading = require("../models/Reading");

async function getRoomOccupancy(room) {
  let currentOccupancy = 0;
  const sensorRef = room.sensorId;
  const sensorId = sensorRef?._id ?? sensorRef;

  if (sensorId) {
    const lastReading = await Reading.findOne({ sensorId })
      .sort({ timestamp: -1 })
      .select("occupancy timestamp");
    currentOccupancy = lastReading?.occupancy ?? 0;
  }

  const occupancyPercent =
    room.capacity > 0
      ? Math.min(100, Math.round((currentOccupancy / room.capacity) * 100))
      : 0;

  return { currentOccupancy, occupancyPercent };
}

function formatSensorRef(sensorRef) {
  if (!sensorRef) return null;
  if (typeof sensorRef === "object" && sensorRef.name) {
    return {
      id: sensorRef._id,
      name: sensorRef.name,
      devEui: sensorRef.devEui,
    };
  }
  return null;
}

async function formatRoomDetail(room) {
  const obj = room.toObject ? room.toObject() : room;
  const { currentOccupancy, occupancyPercent } = await getRoomOccupancy(obj);

  return {
    id: obj._id,
    name: obj.name,
    capacity: obj.capacity,
    geometry: obj.geometry ?? null,
    currentOccupancy,
    occupancyPercent,
    sensor: formatSensorRef(obj.sensorId),
  };
}

async function formatRoomListItem(room) {
  const obj = room.toObject ? room.toObject() : room;
  const { currentOccupancy, occupancyPercent } = await getRoomOccupancy(obj);

  return {
    id: obj._id,
    name: obj.name,
    capacity: obj.capacity,
    geometry: obj.geometry ?? null,
    sensorId: obj.sensorId?._id ?? obj.sensorId ?? null,
    sensor: formatSensorRef(obj.sensorId),
    currentOccupancy,
    occupancyPercent,
  };
}

module.exports = {
  getRoomOccupancy,
  formatRoomDetail,
  formatRoomListItem,
};
