const env = require("../config/env");
const { getDatabaseStatus } = require("../config/database");

function healthCheck(req, res) {
  return res.status(200).json({
    status: "ok",
    message: "API running",
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    config: {
      baseUrl: env.baseUrl,
      mongoEnvName: env.mongoEnvName,
      nodeEnv: env.nodeEnv,
    },
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
