/**
 * Seed uživatelů, senzorů a místností podle aktuální konfigurace v DB.
 * Spuštění: node scripts/seedData.js
 *
 * Idempotentní — existující záznamy (podle email / devEui / názvu místnosti) přeskočí,
 * chybějící doplní a propojí sensorId ↔ roomId.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/Users");
const Sensor = require("../models/Sensor");
const Room = require("../models/room");

const USERS = [
  {
    name: "Admin",
    email: "admin@example.com",
    passwordHash: "$2b$10$YqcaOSNv.5Fs9o3zL679juHZnNeC.2cuvP8mXBqO1MXgpsFz02em2",
    role: "admin",
  },
  {
    name: "Test",
    email: "test@gmail.com",
    passwordHash: "$2b$10$epWH8Bhxw8lVk2heRe/HZeb/bHN3PagKxLS4QShn/BS3ygYdzCduW",
    role: "viewer",
  },
];

const SENSORS = [
  { name: "Real V135 senzor", devEui: "24E124767F020849" },
  { name: "Example senzor1", devEui: "4567822" },
  { name: "Example senzor2", devEui: "4567823" },
  { name: "Example senzor3", devEui: "4567824" },
  { name: "Example senzor4", devEui: "4567825" },
  { name: "Example senzor5", devEui: "4567826" },
];

const ROOMS = [
  {
    name: "Konferenční místnost",
    capacity: 15,
    sensorDevEui: "24E124767F020849",
    geometry: { x: 350, y: 140, width: 370, height: 170 },
  },
  {
    name: "Recepce",
    capacity: 5,
    sensorDevEui: "4567822",
    geometry: { x: 730, y: 140, width: 150, height: 170 },
  },
  {
    name: "Kancelář 1",
    capacity: 5,
    sensorDevEui: "4567824",
    geometry: { x: 350, y: 420, width: 190, height: 110 },
  },
  {
    name: "Kancelář 2",
    capacity: 5,
    sensorDevEui: "4567825",
    geometry: { x: 550, y: 420, width: 170, height: 110 },
  },
  {
    name: "Kancelář 3",
    capacity: 5,
    sensorDevEui: "4567826",
    geometry: { x: 730, y: 420, width: 150, height: 110 },
  },
  {
    name: "Chodba",
    capacity: 10,
    sensorDevEui: "4567823",
    geometry: { x: 350, y: 320, width: 530, height: 90 },
  },
];

async function seedUsers() {
  for (const data of USERS) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      console.log(`⏭️  Uživatel ${data.email} již existuje`);
      continue;
    }
    await User.create(data);
    console.log(`✅ Uživatel: ${data.email} (${data.role})`);
  }
}

async function seedSensors() {
  const map = new Map();

  for (const data of SENSORS) {
    let sensor = await Sensor.findOne({ devEui: data.devEui });
    if (!sensor) {
      sensor = await Sensor.create({
        name: data.name,
        devEui: data.devEui,
        isActive: true,
      });
      console.log(`✅ Senzor: ${data.name} (${data.devEui})`);
    } else {
      sensor.name = data.name;
      sensor.isActive = true;
      await sensor.save();
      console.log(`⏭️  Senzor ${data.devEui} — aktualizován název`);
    }
    map.set(data.devEui, sensor);
  }

  return map;
}

async function seedRooms(sensorMap) {
  const roomMap = new Map();

  for (const data of ROOMS) {
    const sensor = sensorMap.get(data.sensorDevEui);
    if (!sensor) {
      throw new Error(`Senzor ${data.sensorDevEui} nenalezen pro místnost ${data.name}`);
    }

    let room = await Room.findOne({ name: data.name });
    if (!room) {
      room = await Room.create({
        name: data.name,
        capacity: data.capacity,
        sensorId: sensor._id,
        geometry: data.geometry,
      });
      console.log(`✅ Místnost: ${data.name}`);
    } else {
      room.capacity = data.capacity;
      room.sensorId = sensor._id;
      room.geometry = data.geometry;
      await room.save();
      console.log(`⏭️  Místnost ${data.name} — aktualizována`);
    }

    sensor.roomId = room._id;
    await sensor.save();

    roomMap.set(data.name, room);
  }

  return roomMap;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log("🌱 Seed dat — uživatelé, senzory, místnosti\n");

  await seedUsers();
  const sensorMap = await seedSensors();
  await seedRooms(sensorMap);

  console.log("\n✅ Hotovo");
  console.log("   Admin: admin@example.com / heslo123");
  console.log("   Viewer: test@gmail.com (heslo z původního seedu)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Chyba:", err.message);
  process.exit(1);
});
