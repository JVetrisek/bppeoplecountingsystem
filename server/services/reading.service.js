const Reading = require("../models/Reading");
const Room = require("../models/Room");
const { badRequest } = require("./error.service");
const { aggregateFloorReadings, aggregateRoomReadings } = require("../utils/floorAggregation");

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

async function fetchLatestReadingsBefore(field, ids, fromDate, existingIds = new Set()) {
  const beforeReadings = await Promise.all(
    ids.map((id) =>
      Reading.findOne({ [field]: id, timestamp: { $lt: fromDate } }).sort({ timestamp: -1 }).lean()
    )
  );

  return beforeReadings.filter((reading) => reading && !existingIds.has(reading._id.toString()));
}

async function fetchAggregateBaseReadings({ sensorId, roomId, fromDate, toDate }) {
  const filter = buildReadingFilter({
    sensorId,
    roomId,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  });

  return Reading.find(filter).sort({ timestamp: 1 }).lean();
}

async function addLastKnownReadings(readings, field, ids, fromDate) {
  const existingIds = new Set(readings.map((reading) => reading._id.toString()));
  const carryForward = await fetchLatestReadingsBefore(field, ids, fromDate, existingIds);
  return [...carryForward, ...readings];
}

async function fetchReadings(query) {
  const { sensorId, roomId, from, to } = query;
  const filter = buildReadingFilter({ sensorId, roomId, from, to });
  const limit = Math.min(parseInt(query.limit, 10) || 100, 1000);

  const readings = await Reading.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("sensorId", "name devEui");

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

async function aggregateReadings({ sensorId, roomId, from, to, interval }) {
  const toDate = to ? parseDateParam(to) : new Date();
  const fromDate = from ? parseDateParam(from) : new Date(toDate.getTime() - 12 * 60 * 60 * 1000);
  const resolvedInterval = interval || "hour";

  if (roomId || sensorId) {
    const readings = await fetchAggregateBaseReadings({ sensorId, roomId, fromDate, toDate });
    const readingsWithCarry = (roomId || sensorId)
      ? await addLastKnownReadings(
          readings,
          roomId ? "roomId" : "sensorId",
          [roomId || sensorId],
          fromDate
        )
      : readings;

    return aggregateRoomReadings(readingsWithCarry, fromDate, toDate, resolvedInterval);
  }

  const rooms = await Room.find().populate("sensorId");
  const sensorIds = rooms.map((r) => r.sensorId?._id).filter(Boolean);
  const readings = await fetchAggregateBaseReadings({ fromDate, toDate });
  const readingsWithCarry = await addLastKnownReadings(readings, "sensorId", sensorIds, fromDate);

  return aggregateFloorReadings(readingsWithCarry, sensorIds, fromDate, toDate, resolvedInterval);
}

module.exports = {
  fetchReadings,
  fetchRoomReadings,
  aggregateReadings,
};
