const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
} = require("./domain-utils");

const ADMIN_ROLE = "admin";
const ACTIVE_STATUS = "ativo";
const ALLOWED_ROLES = ["aluno", "professor", "admin"];
const ALLOWED_STATUSES = ["ativo", "inativo"];

function serializeManagedUser(user) {
  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    turmas: Array.isArray(user.turmas) ? user.turmas.map(getEntityId) : [],
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertAdmin(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== ADMIN_ROLE) {
    throw createHttpError("Apenas administrador pode gerenciar usuários e perfis.", 403);
  }
  return user;
}

function parseManagedRole(value) {
  const role = normalizeText(value || "aluno");
  if (!ALLOWED_ROLES.includes(role)) {
    throw createHttpError("role deve ser aluno, professor ou admin.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "role", message: "Informe um perfil válido." }],
    });
  }
  return role;
}

function parseManagedStatus(value) {
  const status = normalizeText(value || ACTIVE_STATUS);
  if (!ALLOWED_STATUSES.includes(status)) {
    throw createHttpError("status deve ser ativo ou inativo.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "status", message: "Informe um status válido." }],
    });
  }
  return status;
}

async function assertUniqueEmail(email, ignoredUserId = null) {
  const filters = { email };
  if (ignoredUserId) filters._id = { $ne: ignoredUserId };
  const existingUserQuery = User.findOne(filters);
  const existingUser = typeof existingUserQuery.lean === "function" ? await existingUserQuery.lean() : await existingUserQuery;
  if (existingUser) throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
}

async function createManagedUser(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId);

  const name = parseRequiredText(payload.name || payload.nome, "Nome");
  const email = parseRequiredText(payload.email, "E-mail").toLowerCase();
  const password = parseRequiredText(payload.password || payload.senha, "Senha");
  await assertUniqueEmail(email);

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: parseManagedRole(payload.role || payload.perfil),
    status: parseManagedStatus(payload.status || payload.situacao),
    turmas: [],
  });

  return serializeManagedUser(user);
}

async function listManagedUsers(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId);

  const filters = {};
  const role = parseOptionalText(query.role || query.perfil, "Perfil");
  if (role) filters.role = parseManagedRole(role);

  const status = parseOptionalText(query.status || query.situacao, "Status");
  if (status) filters.status = parseManagedStatus(status);

  const search = parseOptionalText(query.search || query.q || query.texto, "Busca");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    filters.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const { page, limit, skip } = parsePagination(query);
  const [total, users] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).sort({ role: 1, name: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    users: users.map(serializeManagedUser),
    usuarios: users.map(serializeManagedUser),
  };
}

async function getManagedUser(authenticatedUserId, userId) {
  await assertAdmin(authenticatedUserId);
  const id = parseObjectId(userId, "Usuário deve ser um identificador válido.");
  const user = await User.findById(id).lean();
  if (!user) throw createHttpError("Usuário não encontrado.", 404);
  return serializeManagedUser(user);
}

async function updateManagedUser(authenticatedUserId, userId, payload = {}) {
  await assertAdmin(authenticatedUserId);
  const id = parseObjectId(userId, "Usuário deve ser um identificador válido.");
  const current = await User.findById(id).lean();
  if (!current) throw createHttpError("Usuário não encontrado.", 404);

  const updates = {};
  const name = parseOptionalText(payload.name || payload.nome, "Nome");
  if (name) updates.name = name;

  const email = parseOptionalText(payload.email, "E-mail");
  if (email) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== current.email) await assertUniqueEmail(normalizedEmail, id);
    updates.email = normalizedEmail;
  }

  const role = getFirstValue(payload, ["role", "perfil"]);
  if (role !== undefined) updates.role = parseManagedRole(role);

  const status = getFirstValue(payload, ["status", "situacao"]);
  if (status !== undefined) updates.status = parseManagedStatus(status);

  const password = parseOptionalText(payload.password || payload.senha || payload.newPassword || payload.novaSenha, "Senha");
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  return serializeManagedUser(updatedUser);
}

module.exports = {
  createManagedUser,
  getManagedUser,
  listManagedUsers,
  updateManagedUser,
};
