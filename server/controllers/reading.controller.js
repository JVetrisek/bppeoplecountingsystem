const express = require("express");
const router = express.Router();
const { fetchReadings, aggregateReadings } = require("../services/reading.service");
const { handleControllerError } = require("../services/error.service");

router.get("/aggregate", async (req, res) => {
  const { roomId, from, to, interval } = req.query;

  if (interval && interval !== "minute" && interval !== "hour" && interval !== "day") {
    return res.status(400).json({ error: "Parametr interval musí být 'minute', 'hour' nebo 'day'" });
  }

  try {
    const result = await aggregateReadings({
      roomId,
      from,
      to,
      interval: interval || "hour",
    });
    res.json(result);
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await fetchReadings(req.query);
    res.json(result);
  } catch (err) {
    handleControllerError(res, err);
  }
});

module.exports = router;
