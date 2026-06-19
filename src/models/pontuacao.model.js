const mongoose = require("mongoose");

const pontuacaoSchema = new mongoose.Schema(
  {
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", default: null, index: true },
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", default: null, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pontos: { type: Number, required: true, min: 0 },
    pilares: [
      {
        pilar: { type: mongoose.Schema.Types.ObjectId, ref: "Pilar", required: true },
        pontos: { type: Number, required: true, min: 0 },
      },
    ],
    motivo: { type: String, default: "envio_desafio_aprovado", trim: true },
    source: { type: String, default: "envio_desafio", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  {
    collection: "pontuacoes",
    timestamps: true,
  }
);

pontuacaoSchema.index(
  { envio: 1, aluno: 1 },
  {
    unique: true,
    partialFilterExpression: {
      envio: { $type: "objectId" },
      source: "envio_desafio",
    },
  }
);
pontuacaoSchema.index({ "pilares.pilar": 1 });

module.exports = mongoose.model("Pontuacao", pontuacaoSchema);
