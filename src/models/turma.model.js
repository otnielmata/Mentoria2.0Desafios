const mongoose = require("mongoose");

const turmaSchema = new mongoose.Schema(
  {
    admins: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    alunos: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    code: { type: String, default: null, trim: true, index: true },
    deletedAt: { type: Date, default: null },
    description: { type: String, default: null, trim: true },
    endDate: { type: Date, default: null },
    name: { type: String, required: true, trim: true },
    professores: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    startDate: { type: Date, default: null },
    status: { type: String, default: "ativa", trim: true, index: true },
  },
  {
    collection: "turmas",
    timestamps: true,
  }
);

module.exports = mongoose.models.Turma || mongoose.model("Turma", turmaSchema);
