const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const { formatUser } = require("./auth.service");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

async function getUsers() {
  const users = await User.find().sort({ createdAt: 1 });
  return users.map(formatUser);
}

async function createUser(name, email, password, role = "viewer") {
  if (!["viewer", "admin"].includes(role)) {
    throw badRequest("Role musí být 'viewer' nebo 'admin'");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
  });

  return formatUser(user);
}

async function updateUser(id, data) {
  const user = await User.findById(id);
  if (!user) return null;

  const updates = {};

  if ("name" in data) updates.name = data.name;
  if ("email" in data) updates.email = data.email.toLowerCase().trim();
  if ("role" in data) {
    if (!["viewer", "admin"].includes(data.role)) {
      throw badRequest("Role musí být 'viewer' nebo 'admin'");
    }
    updates.role = data.role;
  }
  if ("password" in data && data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }

  try {
    const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    return formatUser(updated);
  } catch (err) {
    if (err.code === 11000) {
      throw conflict("Uživatel s tímto e-mailem již existuje");
    }
    throw err;
  }
}

async function deleteUser(id) {
  const user = await User.findById(id);
  if (!user) return null;

  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      throw forbidden("Nelze smazat posledního administrátora");
    }
  }

  await User.findByIdAndDelete(id);
  return true;
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
