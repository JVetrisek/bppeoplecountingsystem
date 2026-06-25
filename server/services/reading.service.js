const Reading = require("../models/Reading");
const Room = require("../models/room");
const { badRequest } = require("./error.service");

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

function formatReadings(readings) {
  return readings.map(formatReading);
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

function parsePagination(query) {
  const limit = Math.min(parseInt(query.limit, 10) || 100, 1000);
  const usePagination = query.page !== undefined || query.offset !== undefined;

  if (!usePagination) {
    return { limit, offset: 0, usePagination: false };
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset =
    query.offset !== undefined
      ? Math.max(parseInt(query.offset, 10) || 0, 0)
      : (page - 1) * limit;

  return { limit, offset, page, usePagination: true };
}

async function fetchReadings(query) {
  const { sensorId, roomId, from, to } = query;
  const filter = buildReadingFilter({ sensorId, roomId, from, to });
  const { limit, offset, page, usePagination } = parsePagination(query);

  const readings = await Reading.find(filter)
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .populate("sensorId", "name devEui");

  if (!usePagination) {
    return formatReadings(readings);
  }

  const total = await Reading.countDocuments(filter);
  return {
    data: formatReadings(readings),
    pagination: {
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function fetchLatestReading(sensorId) {
  const filter = sensorId ? { sensorId } : {};
  const reading = await Reading.findOne(filter)
    .sort({ timestamp: -1 })
    .populate("sensorId", "name devEui");
  return reading ? formatReading(reading) : null;
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
  const filter = buildReadingFilter({ sensorId, from, to });
  const dateFormat = interval === "day" ? "%Y-%m-%d" : "%Y-%m-%dT%H:00:00.000Z";

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: {
          timestamp: { $dateToString: { format: dateFormat, date: "$timestamp" } },
          roomId: "$roomId",
        },
        avgOccupancy: { $avg: "$occupancy" },
        maxOccupancy: { $max: "$occupancy" },
        minOccupancy: { $min: "$occupancy" },
      },
    },
    { $sort: { "_id.timestamp": 1 } },
  ];

  const rawResults = await Reading.aggregate(pipeline);

  const roomIds = [
    ...new Set(
      rawResults
        .map(({ _id }) => _id.roomId)
        .filter((id) => id != null)
        .map((id) => id.toString())
    ),
  ];

  const rooms = await Room.find({ _id: { $in: roomIds } }).select("name");
  const roomMap = {};
  rooms.forEach((r) => {
    roomMap[r._id.toString()] = r;
  });

  const grouped = {};
  rawResults.forEach(({ _id, avgOccupancy, maxOccupancy, minOccupancy }) => {
    const { timestamp, roomId: readingRoomId } = _id;
    if (!grouped[timestamp]) {
      grouped[timestamp] = { timestamp, totalAvgOccupancy: 0, rooms: [], _count: 0 };
    }

    const room = readingRoomId ? roomMap[readingRoomId.toString()] : null;
    grouped[timestamp].rooms.push({
      roomId: room?._id || readingRoomId || null,
      roomName: room?.name || null,
      avgOccupancy: Math.round(avgOccupancy),
      maxOccupancy,
      minOccupancy,
    });
    grouped[timestamp].totalAvgOccupancy += avgOccupancy;
    grouped[timestamp]._count += 1;
  });

  return Object.values(grouped).map(({ timestamp, totalAvgOccupancy, rooms, _count }) => ({
    timestamp,
    avgOccupancy: Math.round(totalAvgOccupancy / _count),
    rooms,
  }));
}

module.exports = {
  buildReadingFilter,
  fetchReadings,
  fetchLatestReading,
  fetchRoomReadings,
  aggregateReadings,
  formatReading,
};
