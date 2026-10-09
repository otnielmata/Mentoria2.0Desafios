const mongoose = require("mongoose");
const env = require("./env");
const { seedDefaultPilares } = require("../seeds/pilares.seed");

const DATABASE_CACHE_KEY = "__mentoriaDatabaseCache";
const databaseCache = globalThis[DATABASE_CACHE_KEY] || {
  connectionPromise: null,
  seedPromise: null,
};

globalThis[DATABASE_CACHE_KEY] = databaseCache;

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getConnectionOptions() {
  return {
    ...(env.mongoDbName ? { dbName: env.mongoDbName } : {}),
    maxPoolSize: getPositiveInteger(process.env.MONGODB_MAX_POOL_SIZE, 5),
    minPoolSize: 0,
    maxIdleTimeMS: getPositiveInteger(process.env.MONGODB_MAX_IDLE_TIME_MS, 10000),
    serverSelectionTimeoutMS: getPositiveInteger(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 5000),
    connectTimeoutMS: getPositiveInteger(process.env.MONGODB_CONNECT_TIMEOUT_MS, 5000),
    socketTimeoutMS: getPositiveInteger(process.env.MONGODB_SOCKET_TIMEOUT_MS, 20000),
    waitQueueTimeoutMS: getPositiveInteger(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS, 5000),
  };
}

function getReadyState() {
  return Number(mongoose.connection.readyState || 0);
}

async function connectDatabase({ seedDefaults = true } = {}) {
  const readyState = getReadyState();
  if (readyState === 1) {
    return mongoose.connection;
  }

  if (readyState === 2 && databaseCache.connectionPromise) {
    await databaseCache.connectionPromise;
    return mongoose.connection;
  }

  if (readyState === 3) {
    await mongoose.disconnect().catch(() => null);
  }

  if (!databaseCache.connectionPromise) {
    const connectionPromise = mongoose
      .connect(env.mongoUri, getConnectionOptions())
      .then(async () => {
        if (seedDefaults && !databaseCache.seedPromise) {
          databaseCache.seedPromise = Promise.resolve(seedDefaultPilares()).catch((error) => {
            databaseCache.seedPromise = null;
            throw error;
          });
        }

        if (seedDefaults) {
          await databaseCache.seedPromise;
        }

        return mongoose.connection;
      });

    databaseCache.connectionPromise = connectionPromise.catch((error) => {
      databaseCache.connectionPromise = null;
      throw error;
    });
  }

  await databaseCache.connectionPromise;
  databaseCache.connectionPromise = null;
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
