const express = require("express");
const router = express.Router();
const Reading = require("../models/Reading");

// GET /api/readings?sensorId=&from=&to=&limit=
router.get("/", async (req, res) => {
  const { sensorId, from, to, limit } = req.query;
  const filter = {};

  if (sensorId) filter.sensorId = sensorId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const maxLimit = Math.min(parseInt(limit, 10) || 100, 1000);

  try {
    const readings = await Reading.find(filter)
      .sort({ timestamp: -1 })
      .limit(maxLimit)
      .populate("sensorId", "name devEui");
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/readings/latest?sensorId=
router.get("/latest", async (req, res) => {
  const { sensorId } = req.query;
  const filter = sensorId ? { sensorId } : {};

  try {
    const reading = await Reading.findOne(filter)
      .sort({ timestamp: -1 })
      .populate("sensorId", "name devEui");
    if (!reading) return res.status(404).json({ error: "Žádný záznam" });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
