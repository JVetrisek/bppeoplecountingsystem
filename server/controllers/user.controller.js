const express = require("express");
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require("../services/user.service");
const { handleControllerError } = require("../services/error.service");

router.get("/", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    handleControllerError(res, err);
  }
});

router.post("/", async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = req.body.role || "viewer";

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Povinné pole: name, email, password" });
  }

  try {
    const user = await createUser(name, email, password, role);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Uživatel s tímto e-mailem již existuje" });
    }
    handleControllerError(res, err);
  }
});

router.patch("/:id", async (req, res) => {
  const updates = {};

  if ("name" in req.body) {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Povinné pole: name" });
    updates.name = name;
  }

  if ("email" in req.body) {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    if (!email) return res.status(400).json({ error: "Povinné pole: email" });
    updates.email = email;
  }

  if ("role" in req.body) {
    updates.role = req.body.role;
  }

  if ("password" in req.body) {
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!password) return res.status(400).json({ error: "Heslo nesmí být prázdné" });
    updates.password = password;
  }

  try {
    const user = await updateUser(req.params.id, updates);
    if (!user) return res.status(404).json({ error: "Uživatel nenalezen" });
    res.json(user);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    handleControllerError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Uživatel nenalezen" });
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ error: err.message });
    }
    handleControllerError(res, err);
  }
});

module.exports = router;
