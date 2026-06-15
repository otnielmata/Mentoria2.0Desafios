const mongoose = require("mongoose");

const contatoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["whatsapp", "telegram", "discord"], default: null, trim: true },
    url: { type: String, default: null, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const grupoDesafioSchema = new mongoose.Schema(
  {
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    participantes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
    maxParticipantes: { type: Number, required: true, min: 1, max: 5 },
    contato: { type: contatoSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["formando", "completo", "cancelado"],
      default: "formando",
      trim: true,
      index: true,
    },
  },
  {
    collection: "grupos_desafios",
    timestamps: true,
  }
);

grupoDesafioSchema.index({ desafio: 1, turma: 1, status: 1 });

module.exports = mongoose.model("GrupoDesafio", grupoDesafioSchema);
