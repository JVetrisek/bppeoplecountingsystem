export function truncateToHourLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0);
}

export function truncateToDayLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_KEY_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

function isCanonicalSlotKey(timestamp, interval) {
  if (typeof timestamp !== 'string' || timestamp.endsWith('Z')) return false;
  return interval === 'day' ? DAY_KEY_RE.test(timestamp) : HOUR_KEY_RE.test(timestamp);
}

export function slotKey(date, interval) {
  if (interval === 'day') {
    const d = truncateToDayLocal(date);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const d = truncateToHourLocal(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:00:00`;
}

/** Klíč slotu z API — lokální klíč použijeme přímo, UTC ISO převedeme na lokální hodinu. */
export function resolveSlotKey(timestamp, interval) {
  if (typeof timestamp === 'string') {
    if (interval === 'day' && DAY_KEY_RE.test(timestamp)) return timestamp;
    if (interval === 'hour' && HOUR_KEY_RE.test(timestamp)) return timestamp;
  }
  return slotKey(timestamp, interval);
}

/** Parsování klíče slotu jako lokálního wall-clock času (ne UTC ISO). */
export function parseSlotKeyToDate(key) {
  if (typeof key !== 'string') return new Date(key);

  if (DAY_KEY_RE.test(key)) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  if (HOUR_KEY_RE.test(key)) {
    const [datePart, timePart] = key.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm, ss] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, ss, 0);
  }

  return new Date(key);
}

export function generateTimeSlots(from, to, interval) {
  const slots = [];
  let current = interval === 'day' ? truncateToDayLocal(from) : truncateToHourLocal(from);
  const end = new Date(to);

  while (current <= end) {
    slots.push(new Date(current));
    if (interval === 'day') {
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    } else {
      current = new Date(current);
      current.setHours(current.getHours() + 1);
    }
  }

  return slots;
}

export function indexDataBySlot(data, interval, isRoom) {
  const fallback = new Map();
  const canonical = new Map();
  const keyRe = interval === 'day' ? DAY_KEY_RE : HOUR_KEY_RE;

  for (const point of data) {
    const key = resolveSlotKey(point.timestamp, interval);
    const value = isRoom ? point.occupancy : point.avgOccupancy;
    if (value == null) continue;

    const isCanonical = typeof point.timestamp === 'string' && keyRe.test(point.timestamp);
    if (isCanonical) {
      canonical.set(key, value);
    } else if (!canonical.has(key)) {
      if (!fallback.has(key)) fallback.set(key, []);
      fallback.get(key).push(value);
    }
  }

  const result = new Map();
  for (const [key, value] of canonical) {
    result.set(key, value);
  }
  for (const [key, values] of fallback) {
    if (!result.has(key)) {
      result.set(key, values.reduce((sum, v) => sum + v, 0) / values.length);
    }
  }
  return result;
}

/** Sloučí data z /aggregate API se sloty grafu. Ignoruje staré UTC timestampy (…Z). */
export function mergeAggregateSlots(apiData, from, to, interval) {
  const indexed = new Map();

  for (const point of apiData) {
    if (point.avgOccupancy == null) continue;
    if (!isCanonicalSlotKey(point.timestamp, interval)) continue;
    indexed.set(point.timestamp, point.avgOccupancy);
  }

  return generateTimeSlots(from, to, interval).map((slotDate) => {
    const key = slotKey(slotDate, interval);
    const value = indexed.get(key);

    return value === undefined
      ? { timestamp: key, avgOccupancy: null }
      : { timestamp: key, avgOccupancy: value };
  });
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
