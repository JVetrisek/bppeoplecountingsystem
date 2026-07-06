function sensorKey(reading) {
  const id = reading.sensor?.id ?? reading.sensorId;
  return id != null ? String(id) : null;
}

export function getRoomSensorIds(rooms) {
  return [...new Set(rooms.map((r) => r.sensor?.id ?? r.sensorId).filter(Boolean).map(String))];
}

export function aggregateLiveFloorReadings(readings, from, to, sensorIds, rooms = []) {
  const bucketMs = 5 * 60 * 1000;
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const inWindow = readings.filter((r) => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= fromMs && ts <= toMs;
  });

  const ids = (
    sensorIds.length > 0
      ? sensorIds
      : [...new Set(inWindow.map(sensorKey).filter(Boolean))]
  ).map(String);

  if (ids.length === 0) return [];

  const buckets = [];
  let t = Math.floor(fromMs / bucketMs) * bucketMs;
  while (t <= toMs) {
    buckets.push(t);
    t += bucketMs;
  }

  let result = buckets
    .map((bucket) => {
      const total = ids.reduce((sum, sensorId) => {
        const last = inWindow
          .filter(
            (d) =>
              sensorKey(d) === sensorId &&
              new Date(d.timestamp).getTime() <= bucket + bucketMs
          )
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return sum + (last?.occupancy ?? 0);
      }, 0);
      return { timestamp: new Date(bucket).toISOString(), avgOccupancy: total };
    })
    .filter((d) => d.avgOccupancy > 0);

  if (rooms.length > 0) {
    const currentTotal = rooms.reduce((s, r) => s + (r.currentOccupancy ?? 0), 0);
    if (result.length > 0) {
      result[result.length - 1] = {
        ...result[result.length - 1],
        avgOccupancy: currentTotal,
      };
    } else if (currentTotal > 0) {
      const bucket = Math.floor(toMs / bucketMs) * bucketMs;
      result = [{ timestamp: new Date(bucket).toISOString(), avgOccupancy: currentTotal }];
    }
  }

  return result;
}
