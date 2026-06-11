const mongoose = require("mongoose");

const desafioSchema = new mongoose.Schema(
  {
    pilar: { type: mongoose.Schema.Types.ObjectId, ref: "Pilar", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ["facil", "medio", "dificil", "extra"],
      default: "facil",
      trim: true,
      index: true,
    },
    points: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      required: true,
      enum: ["individual", "grupo", "ambos"],
      trim: true,
    },
    maxParticipantes: { type: Number, required: true, min: 1, max: 5 },
    status: { type: String, default: "ativo", trim: true, index: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Desafio", desafioSchema);
