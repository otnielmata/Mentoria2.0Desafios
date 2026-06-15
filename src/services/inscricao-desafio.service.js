require("../models/pilar.model");
require("../models/turma.model");
const AlunoTurma = require("../models/aluno-turma.model");
const Desafio = require("../models/desafio.model");
const GrupoDesafio = require("../models/grupo-desafio.model");
const InscricaoDesafio = require("../models/inscricao-desafio.model");
const User = require("../models/user.model");
const {
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  omitUndefined,
  parseObjectId,
  toIsoDate,
} = require("./domain-utils");

const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const ACTIVE_LINK_STATUS = "ativa";
const SUBSCRIPTION_STATUS = "inscrito";
const OPEN_GROUP_STATUS = "formando";
const COMPLETE_GROUP_STATUS = "completo";
const CONTACT_TYPES = ["whatsapp", "telegram", "discord"];

function serializeUser(user) {
  if (!user) return null;
  if (typeof user !== "object") return { id: getEntityId(user) };
  return omitUndefined({
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
}

function serializePilar(pilar) {
  if (!pilar) return null;
  if (typeof pilar !== "object") return { id: getEntityId(pilar) };
  return omitUndefined({
    id: getEntityId(pilar),
    name: pilar.name,
    description: pilar.description,
    status: pilar.status,
  });
}

function serializeTurma(turma) {
  if (!turma) return null;
  if (typeof turma !== "object") return { id: getEntityId(turma) };
  return omitUndefined({
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    status: turma.status,
  });
}

function serializeDesafio(desafio) {
  if (!desafio) return null;
  if (typeof desafio !== "object") return { id: getEntityId(desafio) };
  return omitUndefined({
    id: getEntityId(desafio),
    pilar: serializePilar(desafio.pilar),
    pilarId: getEntityId(desafio.pilar),
    title: desafio.title,
    description: desafio.description,
    points: desafio.points,
    type: desafio.type,
    maxParticipantes: desafio.maxParticipantes,
    deliveryDate: toIsoDate(desafio.deliveryDate),
    status: desafio.status,
  });
}

function serializeContato(contato = {}) {
  return omitUndefined({
    tipo: contato.tipo || undefined,
    url: contato.url || undefined,
    updatedBy: contato.updatedBy ? getEntityId(contato.updatedBy) : undefined,
    updatedAt: contato.updatedAt ? toIsoDate(contato.updatedAt) : undefined,
  });
}

function serializeGrupo(grupo) {
  return omitUndefined({
    id: getEntityId(grupo),
    desafio: serializeDesafio(grupo.desafio),
    turma: serializeTurma(grupo.turma),
    participantes: (grupo.participantes || []).map(serializeUser),
    totalParticipantes: (grupo.participantes || []).length,
    maxParticipantes: grupo.maxParticipantes,
    vagasRestantes: Math.max(Number(grupo.maxParticipantes || 0) - (grupo.participantes || []).length, 0),
    contato: serializeContato(grupo.contato),
    status: grupo.status,
    createdAt: grupo.createdAt ? toIsoDate(grupo.createdAt) : undefined,
    updatedAt: grupo.updatedAt ? toIsoDate(grupo.updatedAt) : undefined,
  });
}

function serializeInscricao(inscricao) {
  return omitUndefined({
    id: getEntityId(inscricao),
    desafio: serializeDesafio(inscricao.desafio),
    turma: serializeTurma(inscricao.turma),
    grupo: serializeGrupo(inscricao.grupo),
    status: inscricao.status,
    createdAt: inscricao.createdAt ? toIsoDate(inscricao.createdAt) : undefined,
  });
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId).lean();
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError("Apenas aluno pode se inscrever em desafios.", 403);
  return user;
}

async function findStudentTurma(student) {
  const activeLink = await AlunoTurma.findOne({ aluno: getEntityId(student), status: ACTIVE_LINK_STATUS }).sort({ createdAt: -1 }).lean();
  if (activeLink && activeLink.turma) return getEntityId(activeLink.turma);

  const firstUserTurma = Array.isArray(student.turmas) ? student.turmas[0] : null;
  if (firstUserTurma) return getEntityId(firstUserTurma);

  throw createHttpError("Aluno precisa estar vinculado a uma turma ativa para se inscrever em desafios.", 400, {
    code: "STUDENT_CLASS_REQUIRED",
  });
}

async function getActiveDesafio(desafioId) {
  const desafio = await Desafio.findById(desafioId).populate("pilar").lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  if (normalizeText(desafio.status) !== ACTIVE_STATUS) {
    throw createHttpError("Apenas desafios ativos aceitam inscrição.", 400);
  }
  return desafio;
}

async function findOpenGroup({ desafioId, turmaId, maxParticipantes }) {
  const grupos = await GrupoDesafio.find({
    desafio: desafioId,
    turma: turmaId,
    status: OPEN_GROUP_STATUS,
  }).sort({ createdAt: 1 });

  return (grupos || []).find((grupo) => (grupo.participantes || []).length < maxParticipantes) || null;
}

async function joinOrCreateGroup({ desafio, turmaId, alunoId }) {
  const maxParticipantes = Number(desafio.maxParticipantes || 1);
  let grupo = await findOpenGroup({ desafioId: getEntityId(desafio), turmaId, maxParticipantes });

  if (!grupo) {
    grupo = await GrupoDesafio.create({
      desafio: getEntityId(desafio),
      turma: turmaId,
      participantes: [alunoId],
      maxParticipantes,
      status: maxParticipantes === 1 ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS,
    });
    return grupo;
  }

  const participanteIds = (grupo.participantes || []).map(getEntityId);
  if (!participanteIds.includes(alunoId)) participanteIds.push(alunoId);
  grupo.participantes = participanteIds;
  grupo.status = participanteIds.length >= maxParticipantes ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS;
  return grupo.save();
}

async function populateInscricao(inscricaoId) {
  return InscricaoDesafio.findById(inscricaoId)
    .populate({
      path: "desafio",
      populate: { path: "pilar" },
    })
    .populate("turma")
    .populate({
      path: "grupo",
      populate: [
        {
          path: "desafio",
          populate: { path: "pilar" },
        },
        { path: "turma" },
        { path: "participantes", select: "name email role status" },
      ],
    })
    .lean();
}

async function subscribeToChallenge(authenticatedUserId, desafioId) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const existing = await InscricaoDesafio.findOne({ aluno: authenticatedUserId, desafio: id, status: SUBSCRIPTION_STATUS }).lean();
  if (existing) {
    throw createHttpError("Aluno já está inscrito neste desafio.", 409, { code: "CHALLENGE_ALREADY_SUBSCRIBED" });
  }

  const [desafio, turmaId] = await Promise.all([getActiveDesafio(id), findStudentTurma(student)]);
  const grupo = await joinOrCreateGroup({ desafio, turmaId, alunoId: authenticatedUserId });
  const inscricao = await InscricaoDesafio.create({
    desafio: id,
    aluno: authenticatedUserId,
    turma: turmaId,
    grupo: getEntityId(grupo),
    status: SUBSCRIPTION_STATUS,
  });
  const populated = await populateInscricao(getEntityId(inscricao));
  return serializeInscricao(populated || inscricao);
}

async function listMySubscriptions(authenticatedUserId) {
  await getAuthenticatedStudent(authenticatedUserId);
  const inscricoes = await InscricaoDesafio.find({ aluno: authenticatedUserId, status: SUBSCRIPTION_STATUS })
    .sort({ createdAt: -1 })
    .populate({
      path: "desafio",
      populate: { path: "pilar" },
    })
    .populate("turma")
    .populate({
      path: "grupo",
      populate: [
        {
          path: "desafio",
          populate: { path: "pilar" },
        },
        { path: "turma" },
        { path: "participantes", select: "name email role status" },
      ],
    })
    .lean();

  return {
    inscricoes: (inscricoes || []).map(serializeInscricao),
  };
}

async function listGroups(authenticatedUserId, query = {}) {
  const user = await User.findById(authenticatedUserId).lean();
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  const role = normalizeText(user.role);
  const filters = {};

  if (role === STUDENT_ROLE) {
    filters.participantes = authenticatedUserId;
  } else if (!["professor", "admin"].includes(role)) {
    throw createHttpError("Usuário não autorizado a consultar grupos de desafios.", 403);
  }

  const desafioId = getFirstValue(query, ["desafioId", "desafio_id", "desafio"]);
  if (desafioId) filters.desafio = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");

  const grupos = await GrupoDesafio.find(filters)
    .sort({ createdAt: -1 })
    .populate({
      path: "desafio",
      populate: { path: "pilar" },
    })
    .populate("turma")
    .populate("participantes", "name email role status")
    .lean();

  return {
    grupos: (grupos || []).map(serializeGrupo),
  };
}

function parseContactPayload(payload = {}) {
  const tipo = normalizeText(getFirstValue(payload, ["tipo", "tipoContato", "contactType", "contatoTipo"]));
  const url = getFirstValue(payload, ["url", "contato", "contatoUrl", "linkContato"]);

  if (!CONTACT_TYPES.includes(tipo)) {
    throw createHttpError("Tipo de contato deve ser whatsapp, telegram ou discord.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "tipo", message: "Escolha whatsapp, telegram ou discord." }],
    });
  }

  if (typeof url !== "string" || !url.trim()) {
    throw createHttpError("Link de contato do grupo é obrigatório.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "url", message: "Informe o link de contato do grupo." }],
    });
  }

  return { tipo, url: url.trim() };
}

async function updateGroupContact(authenticatedUserId, grupoId, payload = {}) {
  await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(grupoId, "Grupo deve ser um identificador válido.");
  const contato = parseContactPayload(payload);
  const grupo = await GrupoDesafio.findById(id);
  if (!grupo) throw createHttpError("Grupo não encontrado.", 404);
  const participanteIds = (grupo.participantes || []).map(getEntityId);
  if (!participanteIds.includes(authenticatedUserId)) {
    throw createHttpError("Apenas participantes do grupo podem alterar o contato.", 403);
  }

  grupo.contato = {
    ...contato,
    updatedBy: authenticatedUserId,
    updatedAt: new Date(),
  };
  await grupo.save();

  const result = await GrupoDesafio.findById(id)
    .populate({
      path: "desafio",
      populate: { path: "pilar" },
    })
    .populate("turma")
    .populate("participantes", "name email role status")
    .lean();

  return serializeGrupo(result);
}

module.exports = {
  listGroups,
  listMySubscriptions,
  subscribeToChallenge,
  updateGroupContact,
};
