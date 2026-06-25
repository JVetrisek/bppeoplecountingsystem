const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const Reading = require("../models/Reading");
const Room = require("../models/room");
const { extractLineCounts } = require("../services/webhook.service");

function verifyApiKey(req, res) {
  const apiKey = process.env.WEBHOOK_API_KEY;
  if (!apiKey) return true;

  const headerKey = req.headers["x-api-key"];
  if (headerKey !== apiKey) {
    res.status(401).json({ ok: false, error: "Neautorizováno" });
    return false;
  }
  return true;
}

router.post("/", async (req, res) => {
  if (!verifyApiKey(req, res)) return;

  const devEUI = req.body.deviceInfo?.devEui;
  if (!devEUI) {
    return res.status(200).json({ ok: false, error: "Chybí devEUI" });
  }

  try {
    const sensor = await Sensor.findOne({ devEui: devEUI });
    if (!sensor) {
      return res.status(200).json({ ok: false, error: "Neznámý senzor" });
    }

    const decoded = req.body.object;
    if (!decoded) {
      return res.status(200).json({ ok: false, error: "Chybí decoded payload" });
    }

    const { totalIn, totalOut, periodIn, periodOut } = extractLineCounts(decoded);
    const occupancy = Math.max(0, totalIn - totalOut);

    const room = await Room.findOne({ sensorId: sensor._id });

    const reading = new Reading({
      sensorId: sensor._id,
      roomId: room?._id || null,
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

    console.log(`[COLLECT] ${sensor.name} → obsazenost: ${occupancy}`);
    res.status(200).json({ ok: true, occupancy });
  } catch (err) {
    console.error("[COLLECT] Chyba:", err.message);
    res.status(200).json({ ok: false, error: "Interní chyba" });
  }
});

module.exports = router;