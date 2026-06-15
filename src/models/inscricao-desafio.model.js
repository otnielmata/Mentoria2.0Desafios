const mongoose = require("mongoose");

const inscricaoDesafioSchema = new mongoose.Schema(
  {
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    grupo: { type: mongoose.Schema.Types.ObjectId, ref: "GrupoDesafio", required: true, index: true },
    status: {
      type: String,
      enum: ["inscrito", "cancelado"],
      default: "inscrito",
      trim: true,
      index: true,
    },
    canceledAt: { type: Date, default: null },
  },
  {
    collection: "inscricoes_desafios",
    timestamps: true,
  }
);

inscricaoDesafioSchema.index(
  { desafio: 1, aluno: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "inscrito" },
  }
);

module.exports = mongoose.model("InscricaoDesafio", inscricaoDesafioSchema);
