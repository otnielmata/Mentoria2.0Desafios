const mongoose = require("mongoose");

const pilarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: null, trim: true },
    status: { type: String, default: "ativo", trim: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
  },
  {
    collection: "pilares",
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
