const mongoose = require("mongoose");

const authAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: { type: String, required: true, trim: true },
    ip: { type: String, default: null, trim: true },
    userAgent: { type: String, default: null, trim: true },
  },
  {
    collection: "auth_attempts",
    timestamps: true,
  }
);

authAttemptSchema.index({ email: 1, createdAt: -1 });
authAttemptSchema.index({ reason: 1, createdAt: -1 });

module.exports = mongoose.model("AuthAttempt", authAttemptSchema);
