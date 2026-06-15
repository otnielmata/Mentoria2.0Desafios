const mongoose = require("mongoose");

const pilarSchema = new mongoose.Schema(
  {
    description: { type: String, default: null, trim: true },
    isDefault: { type: Boolean, default: false, index: true },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, index: true },
    status: { type: String, default: "ativo", trim: true, index: true },
  },
  {
    collection: "pilares",
    timestamps: true,
  }
);

pilarSchema.index(
  { normalizedName: 1, status: 1 },
  {
    partialFilterExpression: { status: "ativo" },
    unique: true,
  }
);

module.exports = mongoose.models.Pilar || mongoose.model("Pilar", pilarSchema);
