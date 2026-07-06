const BUCKET_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function truncateToHourLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0);
}

function truncateToDayLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function hourSlotKey(date) {
  const d = truncateToHourLocal(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:00:00`;
}

function daySlotKey(date) {
  const d = truncateToDayLocal(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sensorIdKey(reading) {
  const id = reading.sensorId?._id ?? reading.sensorId;
  return id != null ? String(id) : null;
}

function filterReadingsInRange(readings, rangeStartMs, rangeEndMs) {
  return readings.filter((r) => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= rangeStartMs && ts < rangeEndMs;
  });
}

function build5MinBucketTotals(readings, sensorIds, bucketFromMs, bucketToMs, minCarryMs) {
  const ids = sensorIds.map(String);
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const carryFrom = minCarryMs ?? bucketFromMs;

  const totals = new Map();
  let t = Math.floor(bucketFromMs / BUCKET_MS) * BUCKET_MS;

  while (t <= bucketToMs) {
    const bucketEnd = t + BUCKET_MS;
    let total = 0;

    for (const sensorId of ids) {
      let last = null;
      for (const reading of sorted) {
        if (sensorIdKey(reading) !== sensorId) continue;
        const ts = new Date(reading.timestamp).getTime();
        if (ts < carryFrom) continue;
        if (ts <= bucketEnd) last = reading;
      }
      total += last?.occupancy ?? 0;
    }

    totals.set(t, total);
    t += BUCKET_MS;
  }

  return totals;
}

function averageBucketRange(totals, rangeStartMs, rangeEndMs) {
  const values = [];
  let t = Math.floor(rangeStartMs / BUCKET_MS) * BUCKET_MS;

  while (t < rangeEndMs) {
    values.push(totals.get(t) ?? 0);
    t += BUCKET_MS;
  }

  if (!values.length) return null;

  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function generateHourSlots(from, to) {
  const slots = [];
  let current = truncateToHourLocal(from);
  const end = new Date(to);

  while (current <= end) {
    slots.push(new Date(current));
    current = new Date(current);
    current.setHours(current.getHours() + 1);
  }

  return slots;
}

function generateDaySlots(from, to) {
  const slots = [];
  let current = truncateToDayLocal(from);
  const end = truncateToDayLocal(to);

  while (current <= end) {
    slots.push(new Date(current));
    current = new Date(current);
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

function aggregateFloorByHour(readings, sensorIds, from, to) {
  return generateHourSlots(from, to).map((hourStart) => {
    const centerMs = hourStart.getTime();
    const rangeStartMs = centerMs - HALF_HOUR_MS;
    const rangeEndMs = centerMs + HALF_HOUR_MS;
    const windowReadings = filterReadingsInRange(readings, rangeStartMs, rangeEndMs);
    const totals = build5MinBucketTotals(
      windowReadings,
      sensorIds,
      rangeStartMs,
      rangeEndMs - BUCKET_MS,
      rangeStartMs
    );

    const avgOccupancy = averageBucketRange(totals, rangeStartMs, rangeEndMs);
    const maxOccupancy = maxInRange(totals, rangeStartMs, rangeEndMs);
    const minOccupancy = minInRange(totals, rangeStartMs, rangeEndMs);

    return {
      timestamp: hourSlotKey(hourStart),
      avgOccupancy,
      maxOccupancy,
      minOccupancy,
    };
  });
}

function aggregateFloorByDay(readings, sensorIds, from, to) {
  return generateDaySlots(from, to).map((dayStart) => {
    const rangeStartMs = dayStart.getTime();
    const rangeEndMs = rangeStartMs + 24 * HOUR_MS;
    const dayReadings = filterReadingsInRange(readings, rangeStartMs, rangeEndMs);
    const totals = build5MinBucketTotals(
      dayReadings,
      sensorIds,
      rangeStartMs,
      rangeEndMs - BUCKET_MS,
      rangeStartMs
    );

    const avgOccupancy = averageBucketRange(totals, rangeStartMs, rangeEndMs);
    const maxOccupancy = maxInRange(totals, rangeStartMs, rangeEndMs);
    const minOccupancy = minInRange(totals, rangeStartMs, rangeEndMs);

    return {
      timestamp: daySlotKey(dayStart),
      avgOccupancy,
      maxOccupancy,
      minOccupancy,
    };
  });
}

function maxInRange(totals, rangeStartMs, rangeEndMs) {
  const values = collectRangeValues(totals, rangeStartMs, rangeEndMs);
  return values.length ? Math.max(...values) : null;
}

function minInRange(totals, rangeStartMs, rangeEndMs) {
  const values = collectRangeValues(totals, rangeStartMs, rangeEndMs);
  return values.length ? Math.min(...values) : null;
}

function collectRangeValues(totals, rangeStartMs, rangeEndMs) {
  const values = [];
  let t = Math.floor(rangeStartMs / BUCKET_MS) * BUCKET_MS;

  while (t < rangeEndMs) {
    const value = totals.get(t);
    if (value != null && value > 0) values.push(value);
    t += BUCKET_MS;
  }

  return values;
}

function aggregateFloorReadings(readings, sensorIds, from, to, interval) {
  if (interval === "day") {
    return aggregateFloorByDay(readings, sensorIds, from, to);
  }
  return aggregateFloorByHour(readings, sensorIds, from, to);
}

module.exports = {
  aggregateFloorReadings,
  hourSlotKey,
  daySlotKey,
};
