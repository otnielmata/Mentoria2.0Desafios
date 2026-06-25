const mongoose = require("mongoose");

const planoEstudoItemSchema = new mongoose.Schema(
  {
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: null, trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, default: null },
    plannedDateKey: { type: String, default: null, trim: true, index: true },
    scoreWindowStartKey: { type: String, default: null, trim: true, index: true },
    completedAt: { type: Date, default: null, index: true },
    color: { type: String, default: "#8502ab", trim: true },
    status: { type: String, default: "ativo", trim: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "plano_estudo_itens",
    timestamps: true,
  }
);

module.exports = mongoose.model("PlanoEstudoItem", planoEstudoItemSchema);
