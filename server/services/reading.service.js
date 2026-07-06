const Reading = require("../models/Reading");
const Room = require("../models/room");
const { badRequest } = require("./error.service");
const { aggregateFloorReadings } = require("../utils/floorAggregation");

function parseDateParam(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw badRequest("Neplatný formát data");
  }
  return date;
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

function formatReading(reading) {
  const obj = reading.toObject ? reading.toObject() : reading;
  return {
    id: obj._id,
    sensor: formatSensorRef(obj.sensorId),
    timestamp: obj.timestamp,
    totalIn: obj.totalIn,
    totalOut: obj.totalOut,
    periodIn: obj.periodIn,
    periodOut: obj.periodOut,
    occupancy: obj.occupancy,
  };
}

function buildReadingFilter({ sensorId, roomId, from, to }) {
  const filter = {};
  if (sensorId) filter.sensorId = sensorId;
  if (roomId) filter.roomId = roomId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = parseDateParam(from);
    if (to) filter.timestamp.$lte = parseDateParam(to);
  }
  return filter;
}

async function fetchCarryForwardReadings(fromDate, existingIds) {
  const rooms = await Room.find().populate("sensorId");
  const sensorIds = rooms.map((r) => r.sensorId?._id).filter(Boolean);

  const beforeReadings = await Promise.all(
    sensorIds.map((sensorId) =>
      Reading.findOne({ sensorId, timestamp: { $lt: fromDate } })
        .sort({ timestamp: -1 })
        .populate("sensorId", "name devEui")
    )
  );

  return beforeReadings.filter((r) => r && !existingIds.has(r._id.toString()));
}

async function fetchReadings(query) {
  const { sensorId, roomId, from, to, carryForward } = query;
  const filter = buildReadingFilter({ sensorId, roomId, from, to });
  const limit = Math.min(parseInt(query.limit, 10) || 100, 1000);

  const readings = await Reading.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("sensorId", "name devEui");

  if (carryForward === "true" && from && !sensorId && !roomId) {
    const fromDate = parseDateParam(from);
    const existingIds = new Set(readings.map((r) => r._id.toString()));
    const extra = await fetchCarryForwardReadings(fromDate, existingIds);
    readings.push(...extra);
  }

  return readings.map(formatReading);
}

async function fetchRoomReadings(roomId, query) {
  const room = await Room.findById(roomId).populate("sensorId", "name devEui");
  if (!room) return null;

  const readings = await fetchReadings({ ...query, roomId: room._id.toString() });

  return {
    room: {
      id: room._id,
      name: room.name,
      capacity: room.capacity,
      sensor: room.sensorId
        ? {
            id: room.sensorId._id,
            name: room.sensorId.name,
            devEui: room.sensorId.devEui,
          }
        : null,
    },
    readings,
  };
}

async function aggregateReadings({ sensorId, from, to, interval }) {
  const toDate = to ? parseDateParam(to) : new Date();
  const fromDate = from ? parseDateParam(from) : new Date(toDate.getTime() - 12 * 60 * 60 * 1000);

  const rooms = await Room.find().populate("sensorId");
  const sensorIds = sensorId
    ? [sensorId]
    : rooms.map((r) => r.sensorId?._id).filter(Boolean);

  const HALF_HOUR_MS = 30 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  let queryFrom = new Date(fromDate);
  let queryTo = new Date(toDate);

  if (interval === "day") {
    queryFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);
    const endDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 0, 0, 0, 0);
    queryTo = new Date(endDay.getTime() + DAY_MS - 1);
  } else {
    queryFrom = new Date(fromDate.getTime() - HALF_HOUR_MS);
    queryTo = new Date(toDate.getTime() + HALF_HOUR_MS);
  }

  const filter = buildReadingFilter({ sensorId, from: queryFrom.toISOString(), to: queryTo.toISOString() });
  const readings = await Reading.find(filter).sort({ timestamp: 1 }).lean();

  return aggregateFloorReadings(readings, sensorIds, fromDate, toDate, interval || "hour");
}

module.exports = {
  buildReadingFilter,
  fetchReadings,
  fetchRoomReadings,
  aggregateReadings,
  formatReading,
};
