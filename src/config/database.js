const mongoose = require("mongoose");
const env = require("./env");
const { seedDefaultPilares } = require("../seeds/pilares.seed");

let databaseConnectionPromise = null;

function getReadyState() {
  return Number(mongoose.connection.readyState || 0);
}

async function connectDatabase() {
  const readyState = getReadyState();
  if (readyState === 1) {
    return mongoose.connection;
  }

  if (readyState === 2 && databaseConnectionPromise) {
    await databaseConnectionPromise;
    return mongoose.connection;
  }

  if (readyState === 3) {
    await mongoose.disconnect().catch(() => null);
  }

  if (!databaseConnectionPromise) {
    const options = env.mongoDbName ? { dbName: env.mongoDbName } : undefined;
    databaseConnectionPromise = mongoose
      .connect(env.mongoUri, options)
      .then(async () => {
        await seedDefaultPilares();
        return mongoose.connection;
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        databaseConnectionPromise = null;
      });
  }

  await databaseConnectionPromise;
  return mongoose.connection;
}

function getDatabaseStatus() {
  const state = getReadyState();
  const labels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    readyState: state,
    status: labels[state] || "unknown",
  };
}

module.exports = { connectDatabase, getDatabaseStatus };
