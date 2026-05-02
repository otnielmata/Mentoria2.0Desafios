function healthCheck(req, res) {
  return res.status(200).json({
    status: "ok",
    message: "API running",
    timestamp: new Date().toISOString(),
  });
}

function protectedExample(req, res) {
  return res.status(200).json({
    message: "Rota protegida acessada com sucesso.",
    user: req.user,
  });
}

module.exports = {
  healthCheck,
  protectedExample,
};
