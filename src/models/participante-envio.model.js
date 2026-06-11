const mongoose = require("mongoose");

const participanteEnvioSchema = new mongoose.Schema(
  {
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", required: true, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, default: "ativo", trim: true, index: true },
    removedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

participanteEnvioSchema.index(
  { envio: 1, aluno: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ativo" },
  }
);

module.exports = mongoose.model("ParticipanteEnvio", participanteEnvioSchema);
