const app = require("../src/app");
const { connectDatabase } = require("../src/config/database");

let databaseConnectionPromise = null;

async function ensureDatabaseConnection() {
  if (!databaseConnectionPromise) {
    databaseConnectionPromise = connectDatabase().catch((error) => {
      databaseConnectionPromise = null;
      throw error;
    });
  }

  await databaseConnectionPromise;
}

module.exports = async function handler(req, res) {
  await ensureDatabaseConnection();
  return app(req, res);
};
