const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { inactivateExpiredChallenges, startChallengeDeadlineScheduler } = require("./services/desafio-prazo.service");

async function startServer() {
  try {
    await connectDatabase();
    await inactivateExpiredChallenges();
    startChallengeDeadlineScheduler();
    app.listen(env.port, () => {
      console.log(`Server running on ${env.baseUrl}`);
      console.log(`Swagger docs available at ${env.baseUrl}/api/docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
