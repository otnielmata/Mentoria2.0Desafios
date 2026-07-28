const env = require("../config/env");
const { getDatabaseStatus } = require("../config/database");

function healthCheck(req, res) {
  const database = getDatabaseStatus();
  const isDatabaseConnected = database.readyState === 1;
  return res.status(isDatabaseConnected ? 200 : 503).json({
    status: isDatabaseConnected ? "ok" : "degraded",
    message: isDatabaseConnected ? "API running" : "API running without database connection",
    timestamp: new Date().toISOString(),
    database,
    config: {
      baseUrl: env.baseUrl,
      mongoDbName: env.mongoDbName || null,
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
