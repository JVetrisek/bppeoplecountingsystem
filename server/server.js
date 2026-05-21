require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/webhook", require("./routes/Webhook"));
app.use("/api/sensors", require("./routes/Sensors"));
app.use("/api/rooms", require("./routes/Rooms"));
app.use("/api/readings", require("./routes/Readings"));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "People Counter API" });
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