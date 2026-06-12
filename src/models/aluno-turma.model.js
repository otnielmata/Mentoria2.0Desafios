const mongoose = require("mongoose");

const alunoTurmaSchema = new mongoose.Schema(
  {
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    status: { type: String, default: "ativa", trim: true, index: true },
    removedAt: { type: Date, default: null },
  },
  {
    collection: "alunos_turmas",
    timestamps: true,
  }
);

alunoTurmaSchema.index(
  { aluno: 1, turma: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ativa" },
  }
);

module.exports = mongoose.model("AlunoTurma", alunoTurmaSchema);
