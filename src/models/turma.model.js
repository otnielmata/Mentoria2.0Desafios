const mongoose = require("mongoose");

const turmaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: null, trim: true, index: true },
    description: { type: String, default: null, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    alunos: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    professores: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    admins: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    status: { type: String, default: "ativa", trim: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "turmas",
    timestamps: true,
  }
);

module.exports = mongoose.model("Turma", turmaSchema);
