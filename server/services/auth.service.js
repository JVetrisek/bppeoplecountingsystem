const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");

const TOKEN_EXPIRY = "7d";

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function unauthorized(message = "Nesprávné přihlašovací údaje") {
  const err = new Error(message);
  err.statusCode = 401;
  return err;
}

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw unauthorized();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw unauthorized();

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET není nastaven");

  const userData = formatUser(user);
  const token = jwt.sign(userData, secret, { expiresIn: TOKEN_EXPIRY });

  return { token, user: userData };
}

module.exports = { login, formatUser };
