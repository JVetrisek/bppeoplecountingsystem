export function getRangeConfig(range) {
  const now = new Date();

  switch (range) {
    case '12h':
      return { hours: 12, interval: 'hour', from: new Date(now - 12 * 3600000), to: now };
    case '24h':
      return { hours: 24, interval: 'hour', from: new Date(now - 24 * 3600000), to: now };
    case '7d':
      return { hours: 7 * 24, interval: 'day', from: new Date(now - 7 * 24 * 3600000), to: now };
    case '30d':
      return { hours: 30 * 24, interval: 'day', from: new Date(now - 30 * 24 * 3600000), to: now };
    default:
      return { hours: 1, interval: 'hour', from: new Date(now - 3600000), to: now };
  }
}

export function getCustomRangeConfig(from, to) {
  const hours = Math.max(0, (to - from) / 3600000);
  let interval = 'day';
  if (hours < 2) interval = 'minute';
  else if (hours <= 48) interval = 'hour';
  return { hours, interval, from, to };
}

function truncateToHourUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0));
}

function truncateToDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function slotKey(date, interval) {
  if (interval === 'day') {
    return truncateToDayUTC(date).toISOString().slice(0, 10);
  }
  return truncateToHourUTC(date).toISOString();
}

function generateTimeSlots(from, to, interval) {
  const slots = [];
  let current = interval === 'day' ? truncateToDayUTC(from) : truncateToHourUTC(from);
  const end = new Date(to);

  while (current <= end) {
    slots.push(new Date(current));
    if (interval === 'day') {
      current = new Date(current);
      current.setUTCDate(current.getUTCDate() + 1);
    } else {
      current = new Date(current);
      current.setUTCHours(current.getUTCHours() + 1);
    }
  }

  return slots;
}

function indexDataBySlot(data, interval, isRoom) {
  const map = new Map();

  for (const point of data) {
    const key = slotKey(point.timestamp, interval);
    const value = isRoom ? point.occupancy : point.avgOccupancy;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  }

  const result = new Map();
  for (const [key, values] of map) {
    result.set(key, values.reduce((sum, v) => sum + v, 0) / values.length);
  }
  return result;
}

export function fillTimeSlots(data, from, to, interval, isRoom) {
  const indexed = indexDataBySlot(data, interval, isRoom);

  return generateTimeSlots(from, to, interval).map((slotDate) => {
    const key = slotKey(slotDate, interval);
    const value = indexed.get(key);

    if (value === undefined) {
      return isRoom
        ? { timestamp: key, occupancy: null }
        : { timestamp: key, avgOccupancy: null };
    }

    return isRoom
      ? { timestamp: key, occupancy: value }
      : { timestamp: key, avgOccupancy: value };
  });
}

export function aggregateRoomReadings(readings, interval) {
  const map = new Map();

  for (const reading of readings) {
    const key = slotKey(reading.timestamp, interval);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(reading.occupancy);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, values]) => ({
      timestamp,
      occupancy: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    }));
}

export function bucketFloorReadings(readings) {
  const bucketMs = 5 * 60 * 1000;
  const map = new Map();

  for (const reading of readings) {
    const bucket = Math.floor(new Date(reading.timestamp).getTime() / bucketMs) * bucketMs;
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket).push(reading.occupancy);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      timestamp: new Date(ts).toISOString(),
      avgOccupancy: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    }));
}

export function hasChartData(data, isRoom) {
  if (!data?.length) return false;
  return data.some((d) => {
    const value = isRoom ? d.occupancy : d.avgOccupancy;
    return value != null;
  });
}

export function computeStats(data, isRoom) {
  const values = data
    .map((d) => (isRoom ? d.occupancy : d.avgOccupancy))
    .filter((v) => v != null);

  if (!values.length) {
    return { avg: null, max: null, min: null };
  }

  return {
    avg: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

export function buildChartParams(range) {
  const { interval, from } = getRangeConfig(range);
  return { from: from.toISOString(), interval };
}

export function getModalPresetConfig(range) {
  const config = getRangeConfig(range);
  if (range === 'live') {
    return { ...config, interval: 'minute' };
  }
  return config;
}
