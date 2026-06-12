const Heuristic = require("../models/heuristic.model");
const { createHttpError, getEntityId } = require("./domain-utils");

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function validatePayload({ title, description }) {
  const details = [];

  if (!title || typeof title !== "string" || !title.trim()) {
    details.push({ field: "title", message: "Título é obrigatório." });
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    details.push({ field: "description", message: "Descrição é obrigatória." });
  }

  if (details.length > 0) {
    throw createHttpError("Dados de validação inválidos.", 400, {
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

function serializeHeuristic(heuristic, includeAuthor = false) {
  return {
    id: getEntityId(heuristic),
    title: heuristic.title,
    description: heuristic.description,
    ...(includeAuthor
      ? {
          authorId: heuristic.authorId,
          authorEmail: heuristic.authorEmail,
        }
      : {}),
    createdAt: heuristic.createdAt,
  };
}

async function createHeuristic({ title, description, user }) {
  validatePayload({ title, description });

  const normalizedTitle = normalizeTitle(title);
  const existing = await Heuristic.findOne({
    authorId: user.id,
    normalizedTitle,
  });

  if (existing) {
    throw createHttpError("Título de heurística já cadastrado para este usuário.", 409, {
      code: "HEURISTIC_TITLE_ALREADY_EXISTS",
    });
  }

  const heuristic = await Heuristic.create({
    title: title.trim(),
    description: description.trim(),
    normalizedTitle,
    authorId: user.id,
    authorEmail: user.email,
  });

  return serializeHeuristic(heuristic, true);
}

async function listHeuristics() {
  const heuristics = await Heuristic.find({
    isActive: { $ne: false },
    isPublicable: { $ne: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  return heuristics.map((heuristic) => serializeHeuristic(heuristic));
}

module.exports = {
  createHeuristic,
  listHeuristics,
};
