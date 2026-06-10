const mongoose = require("mongoose");

const turmaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, default: "ativa", trim: true },
    totals: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Turma", turmaSchema);
