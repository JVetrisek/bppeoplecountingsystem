/**
 * Průběžně generuje mock readings v pevných 5min slotech (:00, :05, :10, …).
 * Spuštění: node scripts/mockReadings.js
 * Zastavení: Ctrl+C
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Room = require("../models/Room");
const Sensor = require("../models/Sensor");
const Reading = require("../models/Reading");

const REAL_DEV_EUI = "24E124767F020849";
const SLOT_MS = 5 * 60 * 1000;

const sensorState = new Map();
let timer = null;

function isRealSensor(devEui) {
  return devEui?.toUpperCase() === REAL_DEV_EUI;
}

function getSlotTimestamp(date = new Date()) {
  const slot = new Date(date);
  slot.setSeconds(0, 0);
  slot.setMinutes(Math.floor(slot.getMinutes() / 5) * 5);
  return slot;
}

function msUntilNextSlot(date = new Date()) {
  if (date.getSeconds() === 0 && date.getMilliseconds() === 0 && date.getMinutes() % 5 === 0) {
    return 0;
  }

  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMilliseconds(0);
  const minutes = next.getMinutes();
  next.setMinutes(minutes - (minutes % 5) + 5);
  return next.getTime() - date.getTime();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function targetOccupancy(capacity, hour) {
  const workHours = hour >= 8 && hour < 18;
  const peak = hour >= 9 && hour <= 16;

  if (workHours) {
    const base = peak ? 0.5 : 0.25;
    const spread = peak ? 0.45 : 0.3;
    return Math.min(capacity, Math.max(0, Math.round(capacity * (base + Math.random() * spread))));
  }

  if (hour >= 6 && hour < 22) {
    return randomInt(0, Math.max(1, Math.floor(capacity * 0.15)));
  }

  return randomInt(0, Math.max(0, Math.floor(capacity * 0.05)));
}

function initState(sensorId, lastReading) {
  if (lastReading) {
    sensorState.set(sensorId.toString(), {
      totalIn: lastReading.totalIn,
      totalOut: lastReading.totalOut,
      occupancy: lastReading.occupancy,
    });
    return;
  }

  const totalIn = randomInt(20, 80);
  const totalOut = totalIn - randomInt(0, 3);
  sensorState.set(sensorId.toString(), {
    totalIn,
    totalOut,
    occupancy: Math.max(0, totalIn - totalOut),
  });
}

function buildReading(room, sensor, timestamp) {
  const key = sensor._id.toString();
  const state = sensorState.get(key);
  const hour = timestamp.getHours();
  const desired = targetOccupancy(room.capacity, hour);
  const diff = desired - state.occupancy;

  const periodIn = diff > 0 ? diff : 0;
  const periodOut = diff < 0 ? -diff : 0;
  state.totalIn += periodIn;
  state.totalOut += periodOut;
  state.occupancy = Math.max(0, state.totalIn - state.totalOut);

  return {
    sensorId: sensor._id,
    roomId: room._id,
    timestamp,
    totalIn: state.totalIn,
    totalOut: state.totalOut,
    periodIn,
    periodOut,
    occupancy: state.occupancy,
  };
}

async function loadTargets() {
  const rooms = await Room.find().populate("sensorId");
  return rooms.filter(
    (room) => room.sensorId && !isRealSensor(room.sensorId.devEui)
  );
}

async function initSensorStates(targets) {
  for (const room of targets) {
    const lastReading = await Reading.findOne({ sensorId: room.sensorId._id })
      .sort({ timestamp: -1 })
      .lean();
    initState(room.sensorId._id, lastReading);
  }
}

async function generateTick(timestamp) {
  const targets = await loadTargets();
  if (!targets.length) {
    console.log("⚠️  Žádné mock senzory s místností — čekám na další slot");
    return;
  }

  for (const room of targets) {
    const sensor = room.sensorId;

    if (isRealSensor(sensor.devEui)) {
      console.log(`⏭️  Přeskočen reálný senzor ${sensor.devEui}`);
      continue;
    }

    const key = sensor._id.toString();

    if (!sensorState.has(key)) {
      const lastReading = await Reading.findOne({ sensorId: sensor._id })
        .sort({ timestamp: -1 })
        .lean();
      initState(sensor._id, lastReading);
    }

    const reading = buildReading(room, sensor, timestamp);
    await Reading.create(reading);
    await Sensor.findByIdAndUpdate(sensor._id, { lastSeenAt: timestamp });

    console.log(
      `[${timestamp.toISOString()}] ${room.name} (${sensor.devEui}): ` +
        `occupancy=${reading.occupancy}, periodIn=${reading.periodIn}, periodOut=${reading.periodOut}`
    );
  }
}

function scheduleNextTick() {
  const delay = msUntilNextSlot();
  const nextAt = new Date(Date.now() + delay);

  timer = setTimeout(async () => {
    const timestamp = getSlotTimestamp(new Date());
    try {
      await generateTick(timestamp);
    } catch (err) {
      console.error("❌ Chyba při generování:", err.message);
    }
    scheduleNextTick();
  }, delay);

  if (delay > 0) {
    console.log(`⏳ Další slot: ${nextAt.toLocaleTimeString("cs-CZ")}`);
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const targets = await loadTargets();
  console.log(`🚀 Mock readings — sloty každých ${SLOT_MS / 60000} min (:00, :05, :10, …)`);
  console.log(`📡 Senzorů: ${targets.length} (přeskočen reálný ${REAL_DEV_EUI})`);
  console.log("⏹️  Zastavení: Ctrl+C\n");

  await initSensorStates(targets);
  scheduleNextTick();

  const shutdown = async () => {
    clearTimeout(timer);
    console.log("\n👋 Ukončuji mock readings…");
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("❌ Chyba:", err.message);
  process.exit(1);
});
