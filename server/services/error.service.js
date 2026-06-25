function handleControllerError(res, err) {
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Neplatné ID" });
  }
  if (err.statusCode === 400 || err.statusCode === 403 || err.statusCode === 409) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

module.exports = { handleControllerError, badRequest };
