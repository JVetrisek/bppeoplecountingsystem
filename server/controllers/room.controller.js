const express = require("express");
const router = express.Router();
const Sensor = require("../models/Sensor");
const Room = require("../models/Room");
const {
  formatRoomDetail,
  formatRoomListItemWithOccupancy,
  getRoomsOccupancyMap,
} = require("../services/room.service");
const { fetchRoomReadings } = require("../services/reading.service");
const { handleControllerError } = require("../services/error.service");
const { requireAdmin } = require("../middleware/auth.middleware");

function parseCapacity(capacity) {
  if (capacity === undefined || capacity === null || capacity === "") return null;
  if (typeof capacity === "string" && !capacity.trim()) return null;
  const parsed = Number(capacity);
  return Number.isFinite(parsed) ? parsed : null;
}

router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("sensorId", "name devEui lastSeenAt");
    const occupancyMap = await getRoomsOccupancyMap(rooms);
    const roomsWithOccupancy = rooms.map((room) => formatRoomListItemWithOccupancy(room, occupancyMap));
    res.json(roomsWithOccupancy);
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.get("/:id/readings", async (req, res) => {
  try {
    const result = await fetchRoomReadings(req.params.id, req.query);
    if (!result) return res.status(404).json({ error: "Místnost nenalezena" });
    res.json(result);
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("sensorId", "name devEui");
    if (!room) return res.status(404).json({ error: "Místnost nenalezena" });
    res.json(await formatRoomDetail(room));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const capacity = parseCapacity(req.body.capacity);
  const { geometry } = req.body;

  if (!name || capacity === null) {
    return res.status(400).json({ error: "Povinné pole: name, capacity" });
  }

  try {
    const room = new Room({ name, capacity, geometry });
    await room.save();
    res.status(201).json(await formatRoomDetail(room));
  } catch (err) {
    handleControllerError(res, err);
  }
});

// sensorId: <id> → přiřadí senzor | sensorId: null → odpojí | chybí → nemění
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Místnost nenalezena" });

    const updates = { ...req.body };

    if ("name" in req.body) {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      if (!name) return res.status(400).json({ error: "Povinné pole: name" });
      updates.name = name;
    }

    if ("capacity" in req.body) {
      const capacity = parseCapacity(req.body.capacity);
      if (capacity === null) return res.status(400).json({ error: "Povinné pole: capacity" });
      updates.capacity = capacity;
    }

    if ("sensorId" in req.body) {
      if (req.body.sensorId === null) {
        updates.sensorId = null;
      } else {
        const sensor = await Sensor.findById(req.body.sensorId);
        if (!sensor) return res.status(404).json({ error: "Senzor nenalezen" });

        const previousRoom = await Room.findOne({
          sensorId: sensor._id,
          _id: { $ne: room._id },
        }).select("_id");
        if (previousRoom) {
          await Room.findByIdAndUpdate(previousRoom._id, { sensorId: null });
        }

        updates.sensorId = sensor._id;
      }
    }

    const updated = await Room.findByIdAndUpdate(room._id, updates, { new: true }).populate(
      "sensorId",
      "name devEui"
    );
    res.json(await formatRoomDetail(updated));
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Místnost nenalezena" });

    await Room.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleControllerError(res, err);
  }
});

module.exports = router;
