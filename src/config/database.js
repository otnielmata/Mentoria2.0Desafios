const mongoose = require("mongoose");
const env = require("./env");
const { seedDefaultPilares } = require("../seeds/pilares.seed");

async function connectDatabase() {
  await mongoose.connect(env.mongoUri);
  await seedDefaultPilares();
}

function getDatabaseStatus() {
  const state = mongoose.connection.readyState;
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
