function formatSensor(sensor, roomMap = new Map()) {
  const obj = sensor.toObject ? sensor.toObject() : sensor;
  const room = roomMap.get(String(obj._id)) ?? null;

  return {
    id: obj._id,
    name: obj.name,
    devEui: obj.devEui,
    lastSeenAt: obj.lastSeenAt,
    room,
  };
}

async function formatSensors(sensors, roomMap) {
  return sensors.map((sensor) => formatSensor(sensor, roomMap));
}

module.exports = { formatSensor, formatSensors };
