const mongoose = require("mongoose");

const envioDesafioSchema = new mongoose.Schema(
  {
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    description: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["individual", "grupo"],
      trim: true,
      index: true,
    },
    evidencias: { type: [mongoose.Schema.Types.Mixed], required: true },
    participantes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    status: { type: String, default: "pendente", trim: true, index: true },
    feedback: { type: String, default: null, trim: true },
    avaliacao: { type: mongoose.Schema.Types.Mixed, default: null },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    evaluatedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EnvioDesafio", envioDesafioSchema);
