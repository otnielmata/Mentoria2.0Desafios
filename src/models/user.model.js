const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "aluno", trim: true },
    status: { type: String, default: "ativo", trim: true },
    turmas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Turma" }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
