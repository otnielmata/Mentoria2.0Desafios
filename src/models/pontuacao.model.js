const mongoose = require("mongoose");

const pontuacaoSchema = new mongoose.Schema(
  {
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", required: true, index: true },
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pontos: { type: Number, required: true, min: 0 },
    motivo: { type: String, default: "envio_desafio_aprovado", trim: true },
    source: { type: String, default: "envio_desafio", trim: true },
  },
  {
    collection: "pontuacoes",
    timestamps: true,
  }
);

pontuacaoSchema.index({ envio: 1, aluno: 1 }, { unique: true });

module.exports = mongoose.model("Pontuacao", pontuacaoSchema);
