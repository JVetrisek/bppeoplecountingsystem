const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const Room = require("../models/room");
const Reading = require("../models/Reading");

// GET /api/rooms
router.get("/", async (req, res) => {
    try {
      const rooms = await Room.find().populate("sensorId", "name devEui webhookSlug lastSeenAt");
  
      const roomsWithOccupancy = await Promise.all(
        rooms.map(async (room) => {
          let currentOccupancy = 0;
  
          if (room.sensorId) {
            const lastReading = await Reading.findOne({ sensorId: room.sensorId._id })
              .sort({ timestamp: -1 })
              .select("occupancy timestamp");
            currentOccupancy = lastReading?.occupancy ?? 0;
          }
  
          return {
            ...room.toObject(),
            currentOccupancy,
            occupancyPercent: room.capacity > 0
              ? Math.min(100, Math.round((currentOccupancy / room.capacity) * 100))
              : 0,
          };
        })
      );
  
      res.json(roomsWithOccupancy);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// POST /api/rooms
router.post("/", async (req, res) => {
  const { name, capacity, geometry } = req.body;

  if (!name || !capacity) {
    return res.status(400).json({ error: "Povinné pole: name, capacity" });
  }

  try {
    const room = new Room({ name, capacity, geometry });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rooms/:id
router.patch("/:id", async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ error: "Místnost nenalezena" });

    // Pokud se přiřazuje senzor, aktualizuj i Sensor.roomId
    if (req.body.sensorId) {
      await Sensor.findByIdAndUpdate(req.body.sensorId, { roomId: room._id });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rooms/:id
router.delete("/:id", async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ error: "Místnost nenalezena" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;