const mongoose = require("mongoose");

const cupomSchema = new mongoose.Schema(
  {
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ordinal: { type: Number, required: true, min: 1 },
    milestonePoints: { type: Number, required: true, min: 10 },
    status: {
      type: String,
      enum: ["pendente", "validado", "cancelado"],
      default: "pendente",
      trim: true,
      index: true,
    },
    conqueredAt: { type: Date, required: true, default: Date.now, index: true },
    validatedAt: { type: Date, default: null, index: true },
    validatedByDesafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", default: null, index: true },
    validatedByEnvio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", default: null, index: true },
    luckyNumber: { type: Number, default: null, min: 1, index: true },
    luckyNumberAssignedAt: { type: Date, default: null, index: true },
    canceledAt: { type: Date, default: null, index: true },
  },
  {
    collection: "cupons",
    timestamps: true,
  }
);

cupomSchema.index({ aluno: 1, ordinal: 1 }, { unique: true });
cupomSchema.index({ luckyNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Cupom", cupomSchema);
