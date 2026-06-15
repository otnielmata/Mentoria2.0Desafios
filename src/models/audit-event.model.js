const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, trim: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    aluno: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    desafio: { type: mongoose.Schema.Types.ObjectId, ref: "Desafio", default: null, index: true },
    envio: { type: mongoose.Schema.Types.ObjectId, ref: "EnvioDesafio", default: null, index: true },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", default: null, index: true },
    pontuacao: { type: mongoose.Schema.Types.ObjectId, ref: "Pontuacao", default: null, index: true },
    statusAnterior: { type: String, default: null, trim: true },
    statusNovo: { type: String, default: null, trim: true },
    feedback: { type: String, default: null, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: "auditorias",
    timestamps: true,
  }
);

auditEventSchema.index({ eventType: 1, occurredAt: -1 });
auditEventSchema.index({ envio: 1, occurredAt: -1 });
auditEventSchema.index({ aluno: 1, occurredAt: -1 });

module.exports = mongoose.model("AuditEvent", auditEventSchema);
