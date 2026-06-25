const mongoose = require("mongoose");

const eventTypes = Object.freeze({
  live: "ao_vivo",
  recorded: "modulo_gravado",
  special: "conteudo_especial",
});

const eventoAoVivoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, default: null },
    type: {
      type: String,
      enum: Object.values(eventTypes),
      default: eventTypes.live,
      trim: true,
      index: true,
    },
    turma: { type: mongoose.Schema.Types.ObjectId, ref: "Turma", required: true, index: true },
    guestName: { type: String, default: null, trim: true },
    weekNumber: { type: Number, default: null, min: 1 },
    link: { type: String, default: null, trim: true },
    status: { type: String, default: "ativo", trim: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "eventos_ao_vivo",
    timestamps: true,
  }
);

const EventoAoVivo = mongoose.model("EventoAoVivo", eventoAoVivoSchema);

module.exports = EventoAoVivo;
module.exports.eventTypes = eventTypes;
