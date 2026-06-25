const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const { formatSensor, formatSensors } = require("../services/sensor.service");
const { handleControllerError } = require("../services/error.service");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.get("/", authenticate, async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.json(await formatSensors(sensors));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });
    res.json(await formatSensor(sensor));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const devEui = typeof req.body.devEui === "string" ? req.body.devEui.trim() : "";

  if (!name || !devEui) {
    return res.status(400).json({ error: "Povinné pole: name, devEui" });
  }

  try {
    const sensor = new Sensor({ name, devEui });
    await sensor.save();
    res.status(201).json(await formatSensor(sensor));
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.devEui ? "DevEUI" : Object.keys(err.keyPattern || {})[0] || "pole";
      return res.status(409).json({ error: `Senzor s tímto ${field} již existuje` });
    }
    handleControllerError(res, err);
  }
});

router.patch("/:id", authenticate, requireAdmin, async (req, res) => {
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
    res.json(await formatSensor(sensor));
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern?.devEui ? "DevEUI" : Object.keys(err.keyPattern || {})[0] || "pole";
      return res.status(409).json({ error: `Senzor s tímto ${field} již existuje` });
    }
    handleControllerError(res, err);
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });

    if (sensor.roomId) {
      return res.status(409).json({ error: "Senzor je přiřazen k místnosti. Nejdříve ho odpoj." });
    }

    await Sensor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleControllerError(res, err);
  }
});

module.exports = router;
