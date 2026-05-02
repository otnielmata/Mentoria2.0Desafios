const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  mongoUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/mentoria_api",
  jwtSecret: process.env.JWT_SECRET || "fallback-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
};
