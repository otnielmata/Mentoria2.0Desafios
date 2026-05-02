const Heuristic = require("../models/heuristic.model");
const AppError = require("../errors/app-error");

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase();
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
    throw new AppError("Dados de validação inválidos.", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

async function createHeuristic({ title, description, user }) {
  validatePayload({ title, description });

  const normalizedTitle = normalizeTitle(title);

  const existing = await Heuristic.findOne({
    authorId: user.id,
    normalizedTitle,
  });

  if (existing) {
    throw new AppError("Título de heurística já cadastrado para este usuário.", {
      statusCode: 409,
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

  return {
    id: heuristic.id,
    title: heuristic.title,
    description: heuristic.description,
    authorId: heuristic.authorId,
    authorEmail: heuristic.authorEmail,
    createdAt: heuristic.createdAt,
  };
}

module.exports = {
  createHeuristic,
};
