const mongoose = require("mongoose");

const userRoles = Object.freeze({
  admin: "admin",
  student: "aluno",
  teacher: "professor",
});

const userStatuses = Object.freeze({
  active: "ativo",
  inactive: "inativo",
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(userRoles),
      default: userRoles.student,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(userStatuses),
      default: userStatuses.active,
      trim: true,
      index: true,
    },
    discordJoined: { type: Boolean, default: false },
    turmas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Turma" }],
  },
  {
    collection: "users",
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.userRoles = userRoles;
module.exports.userStatuses = userStatuses;
