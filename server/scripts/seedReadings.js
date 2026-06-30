/**
 * Naplní readings vzorovými daty pro všechny místnosti kromě reálného senzoru.
 * Spuštění: node scripts/seedReadings.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Room = require("../models/room");
const Sensor = require("../models/Sensor");
const Reading = require("../models/Reading");

const REAL_DEV_EUI = "24E124767F020849";
const NOW = new Date("2026-06-26T17:53:00.000Z"); // 19:53 CEST
const MONTH_AGO = new Date("2026-05-27T00:00:00.000Z");
const LAST_DAY_START = new Date("2026-06-26T00:00:00.000Z");

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

function generateForRoom(room, sensor) {
  const readings = [];
  let totalIn = randomInt(20, 80);
  let totalOut = totalIn - randomInt(0, Math.min(room.capacity, 3));

  const addReading = (timestamp, capacity) => {
    const hour = timestamp.getUTCHours();
    const desired = targetOccupancy(capacity, hour);
    const current = Math.max(0, totalIn - totalOut);
    const diff = desired - current;

    const periodIn = diff > 0 ? diff : 0;
    const periodOut = diff < 0 ? -diff : 0;
    totalIn += periodIn;
    totalOut += periodOut;

    readings.push({
      sensorId: sensor._id,
      roomId: room._id,
      timestamp: new Date(timestamp),
      totalIn,
      totalOut,
      periodIn,
      periodOut,
      occupancy: Math.max(0, totalIn - totalOut),
    });
  };

  // Zbytek měsíce — každých 30 minut (7:00–20:00)
  const day = new Date(MONTH_AGO);
  while (day < LAST_DAY_START) {
    for (let hour = 7; hour <= 20; hour++) {
      for (const minute of [0, 30]) {
        const timestamp = new Date(Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
          hour,
          minute
        ));
        addReading(timestamp, room.capacity);
      }
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }

  // Poslední den — každých 5 minut do 19:53
  for (let t = LAST_DAY_START.getTime(); t <= NOW.getTime(); t += 5 * 60 * 1000) {
    addReading(new Date(t), room.capacity);
  }

  return readings;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const rooms = await Room.find().populate("sensorId");
  const toSeed = rooms.filter(
    (room) => room.sensorId && room.sensorId.devEui !== REAL_DEV_EUI
  );

  if (!toSeed.length) {
    console.log("Žádné místnosti k naplnění.");
    process.exit(0);
  }

  const allReadings = [];
  for (const room of toSeed) {
    const generated = generateForRoom(room, room.sensorId);
    allReadings.push(...generated);
    await Sensor.findByIdAndUpdate(room.sensorId._id, { lastSeenAt: NOW });
    console.log(`✅ ${room.name}: ${generated.length} záznamů`);
  }

  const BATCH = 500;
  for (let i = 0; i < allReadings.length; i += BATCH) {
    await Reading.insertMany(allReadings.slice(i, i + BATCH), { ordered: false });
  }

  console.log(`\n✅ Celkem vloženo ${allReadings.length} readings pro ${toSeed.length} místností`);
  console.log(`⏭️  Přeskočeno: reálný senzor (${REAL_DEV_EUI})`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Chyba:", err.message);
  process.exit(1);
});
