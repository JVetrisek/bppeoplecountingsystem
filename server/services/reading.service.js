const mongoose = require("mongoose");
const Reading = require("../models/Reading");
const Room = require("../models/Room");
const { badRequest } = require("./error.service");

const BUCKET_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const FRESH_READING_MS = 10 * 60 * 1000;

function parseDateParam(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw badRequest("Neplatný formát data");
  }
  return date;
}

function getStepMs(interval) {
  if (interval === "minute") return BUCKET_MS;
  if (interval === "day") return DAY_MS;
  return HOUR_MS;
}

function generateSlots(from, to, interval) {
  const slots = [];
  const stepMs = getStepMs(interval);
  let current = Math.floor(new Date(from).getTime() / stepMs) * stepMs;
  const end = new Date(to).getTime();

  while (current <= end) {
    slots.push(current);
    current += stepMs;
  }

  return slots;
}

function buildDateTruncExpression(interval) {
  if (interval === "day") {
    return { $dateTrunc: { date: "$timestamp", unit: "day" } };
  }
  if (interval === "minute") {
    return { $dateTrunc: { date: "$timestamp", unit: "minute", binSize: 5 } };
  }
  return { $dateTrunc: { date: "$timestamp", unit: "hour" } };
}

function slotsToSeries(from, to, interval, valueBySlot) {
  return generateSlots(from, to, interval).map((slotStartMs) => ({
    timestamp: new Date(slotStartMs).toISOString(),
    value: valueBySlot.get(slotStartMs) ?? null,
  }));
}

function rowsToSlotMap(rows) {
  const valueBySlot = new Map();
  for (const row of rows) {
    const value = row.total ?? row.value;
    if (row._id != null && value != null) {
      valueBySlot.set(row._id.getTime(), Math.round(value));
    }
  }
  return valueBySlot;
}


async function getFreshOccupancyBySensor(sensorIds, asOf = new Date()) {
  if (!sensorIds.length) return new Map();

  const objectIds = sensorIds.map((id) => new mongoose.Types.ObjectId(id));
  const staleBefore = new Date(asOf.getTime() - FRESH_READING_MS);
  const rows = await Reading.aggregate([
    { $match: { sensorId: { $in: objectIds }, timestamp: { $gte: staleBefore } } },
    { $sort: { sensorId: 1, timestamp: -1 } },
    { $group: { _id: "$sensorId", occupancy: { $first: "$occupancy" } } },
  ]);

  return new Map(
    rows.map((row) => [String(row._id), Math.round(row.occupancy ?? 0)])
  );
}

async function aggregateOccupancySeries({ roomId, sensorIds, fromDate, toDate, interval }) {
  const isFloor = !roomId;

  if (isFloor && !sensorIds.length) {
    return slotsToSeries(fromDate, toDate, interval, new Map());
  }

  const slotExpr = buildDateTruncExpression(interval);
  const valueOp = interval === "minute" ? { $last: "$occupancy" } : { $avg: "$occupancy" };

  const match = isFloor
    ? {
        sensorId: { $in: sensorIds.map((id) => new mongoose.Types.ObjectId(id)) },
        timestamp: { $gte: fromDate, $lte: toDate },
      }
    : {
        roomId: new mongoose.Types.ObjectId(roomId),
        timestamp: { $gte: fromDate, $lte: toDate },
      };

  const pipeline = [{ $match: match }];

  if (interval === "minute") {
    pipeline.push({ $sort: { timestamp: 1 } });
  }

  if (isFloor) {
    pipeline.push(
      {
        $group: {
          _id: { sensorId: "$sensorId", slot: slotExpr },
          value: valueOp,
        },
      },
      {
        $group: {
          _id: "$_id.slot",
          total: { $sum: "$value" },
        },
      }
    );
  } else {
    pipeline.push({ $group: { _id: slotExpr, value: valueOp } });
  }

  pipeline.push({ $sort: { _id: 1 } });

  const rows = await Reading.aggregate(pipeline);
  const valueBySlot = rowsToSlotMap(rows);

  if (isFloor && interval === "minute") {
    const slots = generateSlots(fromDate, toDate, "minute");
    if (slots.length) {
      const freshBySensor = await getFreshOccupancyBySensor(sensorIds, toDate);
      const freshTotal = [...freshBySensor.values()].reduce((sum, value) => sum + value, 0);
      valueBySlot.set(slots[slots.length - 1], freshTotal);
    }
  }

  return slotsToSeries(fromDate, toDate, interval, valueBySlot);
}

async function aggregateReadings({ roomId, from, to, interval }) {
  const toDate = to ? parseDateParam(to) : new Date();
  const fromDate = from ? parseDateParam(from) : new Date(toDate.getTime() - 12 * 60 * 60 * 1000);
  const resolvedInterval = interval || "hour";

  if (roomId) {
    return aggregateOccupancySeries({ roomId, fromDate, toDate, interval: resolvedInterval });
  }

  const rooms = await Room.find().select("sensorId").lean();
  const sensorIds = rooms.map((r) => r.sensorId).filter(Boolean);
  return aggregateOccupancySeries({ sensorIds, fromDate, toDate, interval: resolvedInterval });
}

module.exports = {
  aggregateReadings,
  getFreshOccupancyBySensor,
  FRESH_READING_MS,
};
