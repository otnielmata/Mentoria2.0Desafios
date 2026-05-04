const mongoose = require("mongoose");

const heuristicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    normalizedTitle: { type: String, required: true, trim: true },
    authorId: { type: String, required: true, index: true },
    authorEmail: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true, index: true },
    isPublicable: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

heuristicSchema.index({ authorId: 1, normalizedTitle: 1 }, { unique: true });
heuristicSchema.index({ isActive: 1, isPublicable: 1, createdAt: -1 });

module.exports = mongoose.model("Heuristic", heuristicSchema);
