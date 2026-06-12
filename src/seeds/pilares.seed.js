const Pilar = require("../models/pilar.model");
const { normalizeName } = require("../services/text-normalization.service");

const DEFAULT_PILARES = [
  {
    name: "Conhecimento Técnico Alinhado ao Mercado",
    description: "Aprendizado técnico conectado às demandas reais do mercado.",
  },
  {
    name: "Posicionamento e Softskills",
    description: "Comunicação, postura profissional e desenvolvimento comportamental.",
  },
  {
    name: "Prática",
    description: "Execução prática e aplicação dos conhecimentos da mentoria.",
  },
  {
    name: "Exposição a Problemas",
    description: "Contato com problemas reais, dúvidas e situações de resolução.",
  },
  {
    name: "Compartilhamento",
    description: "Registro e compartilhamento de aprendizados com a comunidade.",
  },
  {
    name: "Networking",
    description: "Relacionamento profissional e interação com pares e mercado.",
  },
  {
    name: "Visibilidade",
    description: "Ações que ampliam presença profissional e exposição pública.",
  },
];

function buildDefaultPilarPayload(pilar) {
  return {
    name: pilar.name,
    normalizedName: normalizeName(pilar.name),
    description: pilar.description,
    status: "ativo",
    isDefault: true,
  };
}

async function seedDefaultPilares() {
  await Promise.all(
    DEFAULT_PILARES.map((pilar) => {
      const payload = buildDefaultPilarPayload(pilar);

      return Pilar.findOneAndUpdate(
        { normalizedName: payload.normalizedName, status: "ativo" },
        { $setOnInsert: payload },
        { upsert: true, new: true }
      );
    })
  );
}

module.exports = {
  DEFAULT_PILARES,
  buildDefaultPilarPayload,
  seedDefaultPilares,
};
