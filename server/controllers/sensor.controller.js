const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const Room = require("../models/Room");
const { formatSensor, formatSensors } = require("../services/sensor.service");
const { handleControllerError } = require("../services/error.service");
const { requireAdmin } = require("../middleware/auth.middleware");

async function buildRoomMap(sensorIds) {
  if (!sensorIds.length) return new Map();

  const rooms = await Room.find({ sensorId: { $in: sensorIds } }).select("name sensorId").lean();
  return new Map(
    rooms.map((room) => [
      String(room.sensorId),
      {
        id: room._id,
        name: room.name,
      },
    ])
  );
}

router.get("/", async (req, res) => {
  try {
    const sensors = await Sensor.find();
    const roomMap = await buildRoomMap(sensors.map((sensor) => sensor._id));
    res.json(await formatSensors(sensors, roomMap));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });
    const roomMap = await buildRoomMap([sensor._id]);
    res.json(await formatSensor(sensor, roomMap));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const devEui = typeof req.body.devEui === "string" ? req.body.devEui.trim() : "";

  if (!name || !devEui) {
    return res.status(400).json({ error: "Povinné pole: name, devEui" });
  }

  try {
    const sensor = new Sensor({ name, devEui });
    await sensor.save();
    res.status(201).json(formatSensor(sensor));
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.devEui ? "DevEUI" : Object.keys(err.keyPattern || {})[0] || "pole";
      return res.status(409).json({ error: `Senzor s tímto ${field} již existuje` });
    }
    handleControllerError(res, err);
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const updates = { ...req.body };

  if ("name" in req.body) {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Povinné pole: name" });
    updates.name = name;
  }

  if ("devEui" in req.body) {
    const devEui = typeof req.body.devEui === "string" ? req.body.devEui.trim() : "";
    if (!devEui) return res.status(400).json({ error: "Povinné pole: devEui" });
    updates.devEui = devEui;
  }

  try {
    const sensor = await Sensor.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });
    const roomMap = await buildRoomMap([sensor._id]);
    res.json(await formatSensor(sensor, roomMap));
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.devEui ? "DevEUI" : Object.keys(err.keyPattern || {})[0] || "pole";
      return res.status(409).json({ error: `Senzor s tímto ${field} již existuje` });
    }
    handleControllerError(res, err);
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });

    const room = await Room.findOne({ sensorId: sensor._id }).select("_id");
    if (room) {
      return res.status(409).json({ error: "Senzor je přiřazen k místnosti. Nejdříve ho odpoj." });
    }

    await Sensor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleControllerError(res, err);
  }
});

module.exports = router;
