const mongoose = require("mongoose");

const quizAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    selectedAlternative: { type: Number, required: true, min: 0, max: 4 },
    correct: { type: Boolean, required: true },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", required: true, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    currentQuestionIndex: { type: Number, required: true, default: 0, min: 0 },
    answers: { type: [quizAnswerSchema], default: [] },
    status: { type: String, enum: ["em_andamento", "concluido"], default: "em_andamento", index: true },
    completedAt: { type: Date, default: null },
    pointsAwarded: { type: Number, default: 0, min: 0 },
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", default: null },
    pontuacao: { type: mongoose.Schema.Types.ObjectId, ref: "Pontuacao", default: null },
  },
  {
    collection: "tentativas_questionarios",
    timestamps: true,
  }
);

quizAttemptSchema.index({ desafio: 1, aluno: 1 }, { unique: true });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
