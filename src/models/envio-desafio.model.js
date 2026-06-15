const mongoose = require("mongoose");

const envioDesafioSchema = new mongoose.Schema(
  {
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    avaliacao: { type: mongoose.Schema.Types.Mixed, default: null },
    canceledAt: { type: Date, default: null },
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    description: { type: String, required: true, trim: true },
    evaluatedAt: { type: Date, default: null },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    evidencias: { type: [mongoose.Schema.Types.Mixed], required: true },
    feedback: { type: String, default: null, trim: true },
    participantes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    status: { type: String, default: "pendente", trim: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    type: {
      type: String,
      enum: ["individual", "grupo"],
      index: true,
      required: true,
      trim: true,
    },
  },
  {
    collection: "envios_desafios",
    timestamps: true,
  }
);

module.exports = mongoose.models.EnvioDesafio || mongoose.model("EnvioDesafio", envioDesafioSchema);
