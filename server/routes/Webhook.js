const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const Reading = require("../models/Reading");

// POST /webhook/:slug
router.post("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const sensor = await Sensor.findOne({ webhookSlug: slug });
    if (!sensor) {
      return res.status(200).json({ ok: false, error: "Neznámý senzor" });
    }

    const decoded = req.body.object;
    if (!decoded) {
      return res.status(200).json({ ok: false, error: "Chybí decoded payload" });
    }

    const totalIn = decoded.line_1_total_in ?? 0;
    const totalOut = decoded.line_1_total_out ?? 0;
    const periodIn = decoded.line_1_period_in ?? 0;
    const periodOut = decoded.line_1_period_out ?? 0;
    const occupancy = Math.max(0, totalIn - totalOut);

    const reading = new Reading({
      sensorId: sensor._id,
      timestamp: req.body.time ? new Date(req.body.time) : new Date(),
      totalIn,
      totalOut,
      periodIn,
      periodOut,
      occupancy,
    });
    await reading.save();

    sensor.lastSeenAt = new Date();
    await sensor.save();

    console.log(`[WEBHOOK] ${sensor.name} → obsazenost: ${occupancy}`);
    res.status(200).json({ ok: true, occupancy });
  } catch (err) {
    console.error("[WEBHOOK] Chyba:", err.message);
    res.status(200).json({ ok: false, error: "Interní chyba" });
  }
});

module.exports = router;