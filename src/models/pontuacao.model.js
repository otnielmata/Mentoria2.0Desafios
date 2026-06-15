const mongoose = require("mongoose");

const pontuacaoSchema = new mongoose.Schema(
  {
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", required: true, index: true },
    motivo: { type: String, default: "envio_desafio_aprovado", trim: true },
    pontos: { type: Number, required: true, min: 0 },
    source: { type: String, default: "envio_desafio", trim: true },
  },
  {
    collection: "pontuacoes",
    timestamps: true,
  }
);

pontuacaoSchema.index({ envio: 1, aluno: 1 }, { unique: true });

module.exports = mongoose.models.Pontuacao || mongoose.model("Pontuacao", pontuacaoSchema);
