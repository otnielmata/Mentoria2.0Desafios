const mongoose = require("mongoose");

const desafioSchema = new mongoose.Schema(
  {
    pilar: { type: mongoose.Schema.Types.ObjectId, ref: "Pilar", required: true, index: true },
    pilares: [
      {
        pilar: { type: mongoose.Schema.Types.ObjectId, ref: "Pilar", required: true },
        points: { type: Number, required: true, min: 1 },
      },
    ],
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    deliveryDate: { type: Date, default: null, index: true },
    difficulty: {
      type: String,
      enum: ["facil", "medio", "dificil", "extra"],
      default: "facil",
      trim: true,
      index: true,
    },
    points: { type: Number, required: true, min: 1 },
    livePresentationPoints: { type: Number, default: 0, min: 0 },
    type: {
      type: String,
      required: true,
      enum: ["individual", "grupo", "ambos"],
      trim: true,
    },
    maxParticipantes: { type: Number, required: true, min: 1, max: 5 },
    recorrencia: {
      enabled: { type: Boolean, default: false },
      periodo: {
        type: String,
        enum: ["diario", "semanal", "mensal"],
        default: "mensal",
        trim: true,
      },
      limitePontos: { type: Number, default: null, min: 1 },
      acaoAoExceder: {
        type: String,
        enum: ["bloquear"],
        default: "bloquear",
        trim: true,
      },
    },
    status: { type: String, default: "ativo", trim: true, index: true },
  },
  {
    collection: "desafios",
    timestamps: true,
  }
);

desafioSchema.index({ "pilares.pilar": 1 });

module.exports = mongoose.model("Desafio", desafioSchema);
