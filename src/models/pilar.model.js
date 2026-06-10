const mongoose = require("mongoose");

const desafioSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, default: "ativo", trim: true },
  },
  {
    _id: true,
    id: false,
  }
);

const pilarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    status: { type: String, default: "ativo", trim: true, index: true },
    desafios: { type: [desafioSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

pilarSchema.index(
  { normalizedName: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ativo" },
  }
);

module.exports = mongoose.model("Pilar", pilarSchema);
