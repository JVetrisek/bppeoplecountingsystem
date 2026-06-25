/**
 * Jednorázový seed — vytvoří admin účet v DB.
 *
 * Spuštění:
 *   node scripts/seedAdmin.js
 *   node scripts/seedAdmin.js admin@example.com heslo123
 *
 * Po použití skript smaž.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/Users");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/people-counter";
const email = process.argv[2] || "admin@example.com";
const password = process.argv[3] || "heslo123";

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log(`⚠️  Uživatel ${email} již existuje — nic se nevytvořilo`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    name: "Admin",
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin",
  });

  console.log(`✅ Admin vytvořen: ${email}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Chyba:", err.message);
  process.exit(1);
});
