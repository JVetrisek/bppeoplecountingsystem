const BUCKET_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function sensorIdKey(reading) {
  const id = reading.sensorId?._id ?? reading.sensorId;
  return id != null ? String(id) : null;
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

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildFloor5MinBuckets(readings, sensorIds, from, to) {
  const ids = sensorIds.map(String);
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const totals = new Map();

  let current = Math.floor(new Date(from).getTime() / BUCKET_MS) * BUCKET_MS;
  const end = new Date(to).getTime();

  while (current <= end) {
    const bucketEnd = current + BUCKET_MS;
    let total = 0;
    let hasValue = false;

    for (const sensorId of ids) {
      let last = null;
      for (const reading of sorted) {
        if (sensorIdKey(reading) !== sensorId) continue;
        const ts = new Date(reading.timestamp).getTime();
        if (ts <= bucketEnd) last = reading;
      }

      if (last) {
        hasValue = true;
        total += last.occupancy ?? 0;
      }
    }

    totals.set(current, hasValue ? total : null);
    current += BUCKET_MS;
  }

  return totals;
}

function aggregateFloorReadings(readings, sensorIds, from, to, interval) {
  const floorBuckets = buildFloor5MinBuckets(readings, sensorIds, from, to);

  if (interval === "minute") {
    return generateSlots(from, to, interval).map((slotStartMs) => ({
      timestamp: new Date(slotStartMs).toISOString(),
      value: floorBuckets.get(slotStartMs) ?? null,
    }));
  }

  const windowMs = getStepMs(interval);
  return generateSlots(from, to, interval).map((slotStartMs) => {
    const values = [];
    let bucketMs = slotStartMs;
    const slotEndMs = slotStartMs + windowMs;

    while (bucketMs < slotEndMs) {
      const value = floorBuckets.get(bucketMs);
      if (value != null) values.push(value);
      bucketMs += BUCKET_MS;
    }

    return {
      timestamp: new Date(slotStartMs).toISOString(),
      value: average(values),
    };
  });
}

function aggregateRoomReadings(readings, from, to, interval) {
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const stepMs = getStepMs(interval);

  return generateSlots(from, to, interval).map((slotStartMs) => {
    const slotEndMs = slotStartMs + stepMs;
    const values = sorted
      .filter((reading) => {
        const ts = new Date(reading.timestamp).getTime();
        return ts >= slotStartMs && ts < slotEndMs;
      })
      .map((reading) => reading.occupancy)
      .filter((value) => value != null);

    return {
      timestamp: new Date(slotStartMs).toISOString(),
      value: average(values),
    };
  });
}

module.exports = {
  aggregateFloorReadings,
  aggregateRoomReadings,
};
