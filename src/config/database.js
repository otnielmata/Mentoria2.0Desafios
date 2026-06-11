const mongoose = require("mongoose");
const env = require("./env");
const { seedDefaultPilares } = require("../seeds/pilares.seed");

async function connectDatabase() {
  await mongoose.connect(env.mongoUri);
  await seedDefaultPilares();
}

module.exports = { connectDatabase };
