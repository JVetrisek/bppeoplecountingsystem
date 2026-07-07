const Reading = require("../models/Reading");

function resolveSensorId(room) {
  const sensorRef = room.sensorId;
  return sensorRef?._id ?? sensorRef ?? null;
}

function buildOccupancyData(room, currentOccupancy = 0) {
  const occupancyPercent =
    room.capacity > 0
      ? Math.min(100, Math.round((currentOccupancy / room.capacity) * 100))
      : 0;

  return { currentOccupancy, occupancyPercent };
}

async function getRoomOccupancy(room) {
  let currentOccupancy = 0;
  const sensorId = resolveSensorId(room);

  if (sensorId) {
    const lastReading = await Reading.findOne({ sensorId })
      .sort({ timestamp: -1 })
      .select("occupancy timestamp");
    currentOccupancy = lastReading?.occupancy ?? 0;
  }

  return buildOccupancyData(room, currentOccupancy);
}

async function getRoomsOccupancyMap(rooms) {
  const sensorIds = rooms
    .map(resolveSensorId)
    .filter(Boolean);

  if (!sensorIds.length) return new Map();

  const latestReadings = await Reading.aggregate([
    { $match: { sensorId: { $in: sensorIds } } },
    { $sort: { sensorId: 1, timestamp: -1 } },
    {
      $group: {
        _id: "$sensorId",
        occupancy: { $first: "$occupancy" },
      },
    },
  ]);

  return new Map(
    latestReadings.map((reading) => [String(reading._id), reading.occupancy ?? 0])
  );
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

function formatRoomListItemWithOccupancy(room, occupancyMap) {
  const obj = room.toObject ? room.toObject() : room;
  const sensorId = resolveSensorId(obj);
  const currentOccupancy = sensorId ? occupancyMap.get(String(sensorId)) ?? 0 : 0;
  const { occupancyPercent } = buildOccupancyData(obj, currentOccupancy);

  return {
    id: obj._id,
    name: obj.name,
    capacity: obj.capacity,
    geometry: obj.geometry ?? null,
    sensorId: resolveSensorId(obj),
    sensor: formatSensorRef(obj.sensorId),
    currentOccupancy,
    occupancyPercent,
  };
}

module.exports = {
  getRoomsOccupancyMap,
  formatRoomDetail,
  formatRoomListItemWithOccupancy,
};
