const express = require("express");
const router = express.Router();
const { login } = require("../services/auth.service");
const { handleControllerError } = require("../services/error.service");

router.post("/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Povinné pole: email, password" });
  }

  try {
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({ error: err.message });
    }
    handleControllerError(res, err);
  }
});

module.exports = router;
