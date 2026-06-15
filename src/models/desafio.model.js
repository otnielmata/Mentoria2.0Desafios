const mongoose = require("mongoose");

const desafioSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      default: "facil",
      enum: ["facil", "medio", "dificil", "extra"],
      index: true,
      trim: true,
    },
    maxParticipantes: { type: Number, required: true, min: 1, max: 5 },
    pilar: { type: mongoose.Schema.Types.ObjectId, ref: "Pilar", required: true, index: true },
    points: { type: Number, required: true, min: 1 },
    status: { type: String, default: "ativo", trim: true, index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["individual", "grupo", "ambos"],
      required: true,
      trim: true,
    },
  },
  {
    collection: "desafios",
    timestamps: true,
  }
);

module.exports = mongoose.models.Desafio || mongoose.model("Desafio", desafioSchema);
