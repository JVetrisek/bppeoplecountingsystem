const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");

// GET /api/sensors
router.get("/", async (req, res) => {
  try {
    const sensors = await Sensor.find();
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensors
router.post("/", async (req, res) => {
  const { name, devEui } = req.body;

  if (!name || !devEui) {
    return res.status(400).json({ error: "Povinné pole: name, devEui" });
  }

  try {
    const sensor = new Sensor({ name, devEui });
    await sensor.save();
    res.status(201).json(sensor);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Senzor s tímto DevEUI již existuje" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sensors/:id
router.patch("/:id", async (req, res) => {
  try {
    const sensor = await Sensor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });
    res.json(sensor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sensors/:id
router.delete("/:id", async (req, res) => {
  try {
    const sensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;