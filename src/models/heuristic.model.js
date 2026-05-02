const mongoose = require("mongoose");

const heuristicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    normalizedTitle: { type: String, required: true, trim: true },
    authorId: { type: String, required: true, index: true },
    authorEmail: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

heuristicSchema.index({ authorId: 1, normalizedTitle: 1 }, { unique: true });

module.exports = mongoose.model("Heuristic", heuristicSchema);
