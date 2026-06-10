const mongoose = require("mongoose");

const turmaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, default: "ativa", trim: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Turma", turmaSchema);
