require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { version } = require("./package.json");

const { authenticate, requireAdmin } = require("./middleware/auth.middleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/readings/collect", require("./controllers/webhook.controller"));
app.use("/api/auth", require("./controllers/auth.controller"));
app.use("/api/users", authenticate, requireAdmin, require("./controllers/user.controller"));
app.use("/api/sensors", require("./controllers/sensor.controller"));
app.use("/api/rooms", require("./controllers/room.controller"));
app.use("/api/readings", require("./controllers/reading.controller"));

// Health check
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

// Připojení k MongoDB a spuštění serveru
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/people-counter";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB připojeno");
    app.listen(PORT, () => {
      console.log(`🚀 Server běží na http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Chyba připojení MongoDB:", err.message);
    process.exit(1);
  });