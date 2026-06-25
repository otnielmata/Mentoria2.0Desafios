const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const AlunoTurma = require("../models/aluno-turma.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const { getChecklistSummaryFromFilters } = require("./plano-estudo.service");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const ALLOWED_STUDENT_STATUSES = ["ativo", "inativo"];
const ACTIVE_CLASS_LINK_STATUS = "ativa";
const INACTIVE_CLASS_LINK_STATUS = "inativa";
const CSV_COLUMN_ALIASES = {
  email: "email",
  mail: "email",
  name: "name",
  nome: "name",
  nomecompleto: "name",
  password: "password",
  senha: "password",
  senhainicial: "password",
  turmacodigo: "turma",
  turma: "turma",
  turmaid: "turma",
  turmanome: "turma",
};

function serializeStudent(user) {
  const discordJoined = user.discordJoined === true;

  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    discordJoined,
    entrouNoDiscord: discordJoined,
    turmas: Array.isArray(user.turmas) ? user.turmas.map(getEntityId) : [],
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

function parseStudentRole(value) {
  const role = normalizeText(value || STUDENT_ROLE);

  if (role !== STUDENT_ROLE) {
    throw createHttpError("role deve ser aluno para cadastro neste endpoint.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "role", message: "role deve ser aluno." }],
    });
  }

  return role;
}

function parseStudentStatus(value) {
  const status = normalizeText(value || ACTIVE_STATUS);

  if (!ALLOWED_STUDENT_STATUSES.includes(status)) {
    throw createHttpError("status deve ser ativo ou inativo.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "status", message: "status deve ser ativo ou inativo." }],
    });
  }

  return status;
}

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;

  const normalized = normalizeText(String(value));
  if (["1", "s", "sim", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "n", "nao", "não", "false", "no", "off"].includes(normalized)) return false;

  throw createHttpError("Valor de Discord deve ser verdadeiro ou falso.", 400, {
    code: "VALIDATION_ERROR",
    details: [{ field: "discordJoined", message: "Informe true/false, sim/não ou marque/desmarque o checkbox." }],
  });
}

function getLeanResult(query) {
  return query && typeof query.lean === "function" ? query.lean() : query;
}

async function assertTurmaExists(turmaId) {
  if (!turmaId) return null;

  const turma = await Turma.findById(turmaId);
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return turma;
}

async function syncStudentTurma(studentId, turmaId) {
  const normalizedTurmaId = turmaId || null;

  if (typeof AlunoTurma.updateMany === "function") {
    await AlunoTurma.updateMany(
      { aluno: studentId, status: ACTIVE_CLASS_LINK_STATUS },
      { status: INACTIVE_CLASS_LINK_STATUS, removedAt: new Date() }
    );
  }

  if (typeof Turma.updateMany === "function") {
    await Turma.updateMany({ alunos: studentId }, { $pull: { alunos: studentId } });
  }

  if (!normalizedTurmaId) {
    return [];
  }

  if (typeof AlunoTurma.findOneAndUpdate === "function") {
    await AlunoTurma.findOneAndUpdate(
      { aluno: studentId, turma: normalizedTurmaId },
      { aluno: studentId, turma: normalizedTurmaId, status: ACTIVE_CLASS_LINK_STATUS, removedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else if (typeof AlunoTurma.create === "function") {
    await AlunoTurma.create({ aluno: studentId, turma: normalizedTurmaId, status: ACTIVE_CLASS_LINK_STATUS });
  }

  if (typeof Turma.updateOne === "function") {
    await Turma.updateOne({ _id: normalizedTurmaId }, { $addToSet: { alunos: studentId } });
  }

  return [normalizedTurmaId];
}

function parseCsvTable(csvText) {
  const text = parseRequiredText(csvText, "Arquivo CSV");
  const delimiter = detectCsvDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  if (rows.length < 2) {
    throw createHttpError("CSV deve conter cabeçalho e ao menos um aluno.", 400, { code: "INVALID_CSV" });
  }

  return rows;
}

function detectCsvDelimiter(text) {
  let commas = 0;
  let semicolons = 0;
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') index += 1;
      else insideQuotes = !insideQuotes;
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      break;
    } else if (char === "," && !insideQuotes) {
      commas += 1;
    } else if (char === ";" && !insideQuotes) {
      semicolons += 1;
    }
  }

  return semicolons > commas ? ";" : ",";
}

function normalizeCsvHeader(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function mapCsvHeaders(headers) {
  const mapped = {};

  headers.forEach((header, index) => {
    const field = CSV_COLUMN_ALIASES[normalizeCsvHeader(header)];
    if (field) mapped[field] = index;
  });

  ["name", "email", "password", "turma"].forEach((field) => {
    if (mapped[field] === undefined) {
      throw createHttpError("CSV deve conter as colunas Nome, E-mail, Senha Inicial e Turma.", 400, {
        code: "INVALID_CSV",
        details: [{ field, message: "Coluna obrigatória ausente." }],
      });
    }
  });

  return mapped;
}

function getCsvCell(row, headerMap, field) {
  return row[headerMap[field]] || "";
}

async function findTurmaByReference(reference) {
  const value = parseRequiredText(reference, "Turma");

  if (mongoose.isValidObjectId(value)) {
    const turma = await Turma.findById(value);
    if (turma) return turma;
  }

  if (typeof Turma.findOne !== "function") return null;

  const query = Turma.findOne({
    $or: [{ name: new RegExp(`^${escapeRegex(value)}$`, "i") }, { code: new RegExp(`^${escapeRegex(value)}$`, "i") }],
  });
  return getLeanResult(query);
}

async function importStudentsFromCsv(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode importar alunos.");

  const csvText = typeof payload === "string" ? payload : payload.csv || payload.csvText || payload.conteudo || payload.content;
  const rows = parseCsvTable(csvText);
  const headerMap = mapCsvHeaders(rows[0]);
  const result = {
    total: rows.length - 1,
    importados: 0,
    falhas: 0,
    alunos: [],
    erros: [],
  };

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 1;

    try {
      const name = parseRequiredText(getCsvCell(row, headerMap, "name"), "Nome");
      const email = parseRequiredText(getCsvCell(row, headerMap, "email"), "E-mail").toLowerCase();
      const password = parseRequiredText(getCsvCell(row, headerMap, "password"), "Senha inicial");
      const turma = await findTurmaByReference(getCsvCell(row, headerMap, "turma"));
      if (!turma) throw createHttpError("Turma do CSV não encontrada.", 404);

      const existingUser = await getLeanResult(User.findOne({ email }));
      if (existingUser) throw createHttpError("E-mail já está em uso.", 409);

      const turmaId = turma._id || turma.id;
      const student = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: STUDENT_ROLE,
        status: ACTIVE_STATUS,
        discordJoined: false,
        turmas: [turmaId],
      });

      await AlunoTurma.create({ aluno: student._id || student.id, turma: turmaId, status: ACTIVE_CLASS_LINK_STATUS });
      if (typeof Turma.updateOne === "function") {
        await Turma.updateOne({ _id: turmaId }, { $addToSet: { alunos: student._id || student.id } });
      }

      result.alunos.push(serializeStudent(student));
    } catch (error) {
      result.erros.push({
        linha: line,
        email: getCsvCell(row, headerMap, "email") || undefined,
        message: error.message || "Não foi possível importar esta linha.",
      });
    }
  }

  result.importados = result.alunos.length;
  result.falhas = result.erros.length;

  return result;
}

async function createStudent(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar alunos.");

  const name = parseRequiredText(payload.name, "Nome");
  const email = parseRequiredText(payload.email, "E-mail").toLowerCase();
  const password = parseRequiredText(payload.password, "Senha");
  const role = parseStudentRole(payload.role || payload.perfil);
  const status = parseStudentStatus(payload.status || payload.situacao);
  const turmaId = parseOptionalObjectId(payload.turmaId || payload.turma_id || payload.turma, "Turma deve ser um identificador válido.");
  const turma = await assertTurmaExists(turmaId);
  const discordJoined = parseBooleanFlag(getFirstValue(payload, ["discordJoined", "entrouNoDiscord", "discord", "isInDiscord"]), false);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw createHttpError("E-mail já está em uso.", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const student = await User.create({
    name,
    email,
    passwordHash,
    role,
    status,
    discordJoined,
    turmas: turma ? [turma._id || turma.id] : [],
  });

  if (turma) {
    await AlunoTurma.create({ aluno: student._id || student.id, turma: turma._id || turma.id, status: "ativa" });
    if (typeof Turma.updateOne === "function") {
      await Turma.updateOne({ _id: turma._id || turma.id }, { $addToSet: { alunos: student._id || student.id } });
    }
  }

  return serializeStudent(student);
}

async function listStudents(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode listar alunos.");

  const filters = { role: STUDENT_ROLE };
  const andFilters = [];
  const status = parseOptionalText(query.status, "status");
  if (status) filters.status = status;

  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) {
    const links = await AlunoTurma.find({ turma: turmaId, status: "ativa" }).lean();
    const alunoIds = (links || []).map((link) => getEntityId(link.aluno)).filter(Boolean);
    andFilters.push({ $or: [{ _id: { $in: alunoIds } }, { turmas: turmaId }] });
  }

  const search = parseOptionalText(query.search || query.q || query.texto, "Busca");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    andFilters.push({ $or: [{ name: searchRegex }, { email: searchRegex }] });
  }

  if (andFilters.length > 0) filters.$and = andFilters;

  const { page, limit, skip } = parsePagination(query);
  const [total, students] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    alunos: students.map(serializeStudent),
  };
}

async function getPontuacaoResumo(studentId) {
  const [pontuacoes, checklistSummary] = await Promise.all([Pontuacao.find({ aluno: studentId }).lean(), getChecklistSummaryFromFilters({ alunoId: studentId })]);
  const totalPontos = (pontuacoes || []).reduce((total, pontuacao) => total + Number(pontuacao.pontos || 0), 0);
  const desafiosAprovados = new Set((pontuacoes || []).map((pontuacao) => getEntityId(pontuacao.envio)).filter(Boolean)).size;

  return {
    totalPontos: totalPontos + Number((checklistSummary && checklistSummary.totalPontos) || 0),
    desafiosAprovados,
  };
}

async function getStudent(authenticatedUserId, studentId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode visualizar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOne({ _id: id, role: STUDENT_ROLE }).populate("turmas").lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  return {
    ...serializeStudent(student),
    pontuacao: await getPontuacaoResumo(id),
  };
}

async function updateStudent(authenticatedUserId, studentId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOne({ _id: id, role: STUDENT_ROLE }).lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);

  const updates = {};
  const name = parseOptionalText(payload.name || payload.nome, "Nome");
  if (name) updates.name = name;

  const email = parseOptionalText(payload.email, "E-mail");
  if (email) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== student.email) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: id } }).lean();
      if (existingUser) throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
    }
    updates.email = normalizedEmail;
  }

  const status = parseOptionalText(payload.status || payload.situacao, "Status");
  if (status) updates.status = parseStudentStatus(status);

  const password = parseOptionalText(payload.password || payload.senha || payload.newPassword || payload.novaSenha, "Senha");
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const rawDiscordJoined = getFirstValue(payload, ["discordJoined", "entrouNoDiscord", "discord", "isInDiscord"]);
  if (rawDiscordJoined !== undefined) updates.discordJoined = parseBooleanFlag(rawDiscordJoined);

  const rawTurmaId = getFirstValue(payload, ["turmaId", "turma_id", "turma"]);
  if (rawTurmaId !== undefined) {
    const turmaId = parseOptionalObjectId(rawTurmaId, "Turma deve ser um identificador válido.");
    await assertTurmaExists(turmaId);
    updates.turmas = await syncStudentTurma(id, turmaId);
  }

  const updated = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  return serializeStudent(updated);
}

async function disableStudent(authenticatedUserId, studentId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode desativar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOneAndUpdate({ _id: id, role: STUDENT_ROLE }, { status: "inativo" }, { new: true }).lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  return serializeStudent(student);
}

module.exports = {
  createStudent,
  disableStudent,
  getStudent,
  importStudentsFromCsv,
  listStudents,
  updateStudent,
};
