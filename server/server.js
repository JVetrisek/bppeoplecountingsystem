require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { version } = require("./package.json");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/people-counter";

function registerRoutes() {
  const { authenticate, requireAdmin } = require("./middleware/auth.middleware");

  app.use("/api/readings/collect", require("./controllers/webhook.controller"));
  app.use("/webhook", require("./controllers/webhook.controller"));
  app.use("/api/auth", require("./controllers/auth.controller"));
  app.use("/api/users", authenticate, requireAdmin, require("./controllers/user.controller"));
  app.use("/api/sensors", authenticate, require("./controllers/sensor.controller"));
  app.use("/api/rooms", authenticate, require("./controllers/room.controller"));
  app.use("/api/readings", authenticate, require("./controllers/reading.controller"));

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      message: "People Counter API",
      version,
      uptime: Math.floor(process.uptime()),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: "Endpoint neexistuje" });
  });
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    registerRoutes();
    app.listen(PORT, () => {
      console.log(`server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("connection error", err.message);
    process.exit(1);
  });
