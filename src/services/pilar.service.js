const Pilar = require("../models/pilar.model");

function serializePilar(pilar) {
  return {
    id: String(pilar.id || pilar._id),
    name: pilar.name,
    normalizedName: pilar.normalizedName,
    description: pilar.description,
    status: pilar.status,
    isDefault: Boolean(pilar.isDefault),
  };
}

async function listPilares(query = {}) {
  const filters = {};
  if (query.status) {
    filters.status = String(query.status).trim();
  } else {
    filters.status = "ativo";
  }

  const pilares = await Pilar.find(filters).sort({ name: 1 }).lean();

  return {
    total: pilares.length,
    pilares: pilares.map(serializePilar),
  };
}

module.exports = {
  listPilares,
};
