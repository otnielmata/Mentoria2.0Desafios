const Pilar = require("../models/pilar.model");
const Turma = require("../models/turma.model");
const AlunoTurma = require("../models/aluno-turma.model");
const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const GrupoDesafio = require("../models/grupo-desafio.model");
const InscricaoDesafio = require("../models/inscricao-desafio.model");
const User = require("../models/user.model");
const { inactivateExpiredChallenges, isDeliveryDeadlineExpired } = require("./desafio-prazo.service");
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
const DEFAULT_GROUP_MODE = "normal";
const ENGLISH_GROUP_MODE = "ingles";
const GROUP_MODES = [DEFAULT_GROUP_MODE, ENGLISH_GROUP_MODE];
const ACTIVE_TURMA_STATUS = "ativa";
const groupLocks = new Map();

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.codeName === "DuplicateKey"));
}

function withLock(lockMap, key, task) {
  const previous = lockMap.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  lockMap.set(key, current);
  return current.finally(() => {
    if (lockMap.get(key) === current) lockMap.delete(key);
  });
}

function normalizeGroupMode(value) {
  const modalidade = normalizeText(value) || DEFAULT_GROUP_MODE;
  if (!GROUP_MODES.includes(modalidade)) {
    throw createHttpError("Modalidade do grupo deve ser normal ou ingles.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "modalidade", message: "Escolha a modalidade normal ou ingles." }],
    });
  }
  return modalidade;
}

function getStoredGroupMode(entity) {
  return normalizeText(entity && entity.modalidade) === ENGLISH_GROUP_MODE ? ENGLISH_GROUP_MODE : DEFAULT_GROUP_MODE;
}

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

function serializePilarPontuacao(item) {
  if (!item) return null;
  const pilar = item.pilar || item.pilarId || item.id;
  const points = Number(item.points || item.pontos || 0);
  return omitUndefined({
    pilar: serializePilar(pilar),
    pilarId: getEntityId(pilar),
    points,
    pontos: points,
  });
}

function getPilaresPontuacao(desafio) {
  const configured = Array.isArray(desafio.pilares) ? desafio.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId) : [];
  if (configured.length > 0) return configured;
  const points = Number(desafio.points || 0);
  return desafio.pilar && points > 0 ? [{ pilar: serializePilar(desafio.pilar), pilarId: getEntityId(desafio.pilar), points, pontos: points }] : [];
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
  const pilares = getPilaresPontuacao(desafio);
  return omitUndefined({
    id: getEntityId(desafio),
    pilar: serializePilar(desafio.pilar),
    pilarId: getEntityId(desafio.pilar),
    pilares,
    pontosPorPilar: pilares,
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
    modalidade: getStoredGroupMode(grupo),
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
    modalidade: getStoredGroupMode(inscricao.grupo || inscricao),
    status: inscricao.status,
    createdAt: inscricao.createdAt ? toIsoDate(inscricao.createdAt) : undefined,
  });
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId).lean();
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError("Apenas aluno pode se inscrever em desafios.", 403);
  if (normalizeText(user.status || ACTIVE_STATUS) !== ACTIVE_STATUS) {
    throw createHttpError("Aluno inativo não pode se inscrever em desafios.", 403, { code: "INACTIVE_USER" });
  }
  return user;
}

async function findStudentTurma(student) {
  const activeLink = await AlunoTurma.findOne({ aluno: getEntityId(student), status: ACTIVE_LINK_STATUS }).sort({ createdAt: -1 }).lean();
  if (activeLink && activeLink.turma) {
    const activeTurmaId = await findActiveTurmaId(activeLink.turma);
    if (activeTurmaId) return activeTurmaId;
  }

  const userTurmas = Array.isArray(student.turmas) ? student.turmas : [];
  for (const userTurma of userTurmas) {
    const activeTurmaId = await findActiveTurmaId(userTurma);
    if (activeTurmaId) return activeTurmaId;
  }

  throw createHttpError("Aluno precisa estar vinculado a uma turma ativa para se inscrever em desafios.", 400, {
    code: "STUDENT_CLASS_REQUIRED",
  });
}

async function findActiveTurmaId(turma) {
  const turmaId = getEntityId(turma);
  if (!turmaId || typeof Turma.findById !== "function") return turmaId || null;
  const query = Turma.findById(turmaId);
  const record = typeof query.lean === "function" ? await query.lean() : await query;
  return record && normalizeText(record.status || ACTIVE_TURMA_STATUS) === ACTIVE_TURMA_STATUS ? turmaId : null;
}

async function getActiveDesafio(desafioId) {
  await inactivateExpiredChallenges();
  const desafio = await Desafio.findById(desafioId).populate([{ path: "pilar" }, { path: "pilares.pilar" }]).lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  if (isDeliveryDeadlineExpired(desafio)) {
    throw createHttpError("Prazo de inscrição do desafio encerrado.", 400, {
      code: "CHALLENGE_REGISTRATION_CLOSED",
    });
  }
  if (normalizeText(desafio.status) !== ACTIVE_STATUS) {
    throw createHttpError("Apenas desafios ativos aceitam inscrição.", 400);
  }
  const pilarRefs = [desafio.pilar, ...(Array.isArray(desafio.pilares) ? desafio.pilares.map((item) => item && item.pilar) : [])].filter(Boolean);
  if (pilarRefs.some((pilar) => normalizeText(pilar.status || ACTIVE_STATUS) !== ACTIVE_STATUS)) {
    throw createHttpError("Apenas desafios vinculados a pilares ativos aceitam inscrição.", 400, { code: "INACTIVE_PILAR" });
  }
  return desafio;
}

async function findOpenGroup({ desafioId, turmaId, maxParticipantes, modalidade }) {
  const grupos = await GrupoDesafio.find({
    desafio: desafioId,
    turma: turmaId,
    modalidade: modalidade === ENGLISH_GROUP_MODE ? ENGLISH_GROUP_MODE : { $in: [DEFAULT_GROUP_MODE, null] },
    status: OPEN_GROUP_STATUS,
  }).sort({ createdAt: 1 });

  const candidateGroups = (grupos || []).filter((grupo) => (grupo.participantes || []).length < maxParticipantes);
  if (candidateGroups.length === 0 || typeof EnvioDesafio.find !== "function") return candidateGroups[0] || null;

  const groupIds = candidateGroups.map(getEntityId).filter(Boolean);
  const submitted = await EnvioDesafio.find({ grupo: { $in: groupIds }, status: { $ne: "cancelado" } }).select("grupo").lean();
  const submittedGroupIds = new Set((submitted || []).map((envio) => getEntityId(envio.grupo)));
  return candidateGroups.find((grupo) => !submittedGroupIds.has(getEntityId(grupo))) || null;
}

async function joinOrCreateGroup({ desafio, turmaId, alunoId, modalidade }) {
  const maxParticipantes = Number(desafio.maxParticipantes || 1);
  const desafioId = getEntityId(desafio);
  const lockKey = `${desafioId}:${turmaId}:${modalidade}`;

  return withLock(groupLocks, lockKey, async () => {
    const groupFilter = {
      desafio: desafioId,
      turma: turmaId,
      modalidade: modalidade === ENGLISH_GROUP_MODE ? ENGLISH_GROUP_MODE : { $in: [DEFAULT_GROUP_MODE, null] },
      status: OPEN_GROUP_STATUS,
    };

    const grupoDisponivel = await findOpenGroup({ desafioId, turmaId, maxParticipantes, modalidade });

    // The atomic update prevents two requests from adding people to the same full group.
    if (grupoDisponivel && typeof GrupoDesafio.findOneAndUpdate === "function") {
      const grupoAtualizado = await GrupoDesafio.findOneAndUpdate(
        {
          ...groupFilter,
          _id: getEntityId(grupoDisponivel),
          $expr: { $lt: [{ $size: { $ifNull: ["$participantes", []] } }, "$maxParticipantes"] },
        },
        { $addToSet: { participantes: alunoId } },
        { new: true }
      );
      if (grupoAtualizado) {
        const total = (grupoAtualizado.participantes || []).length;
        grupoAtualizado.status = total >= maxParticipantes ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS;
        if (total >= maxParticipantes && typeof grupoAtualizado.save === "function") await grupoAtualizado.save();
        return grupoAtualizado;
      }
    }

    let grupo = grupoDisponivel;
    if (!grupo) {
      grupo = await GrupoDesafio.create({
        desafio: desafioId,
        turma: turmaId,
        participantes: [alunoId],
        maxParticipantes,
        modalidade,
        status: maxParticipantes === 1 ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS,
      });
      return grupo;
    }

    const participanteIds = (grupo.participantes || []).map(getEntityId);
    if (!participanteIds.includes(alunoId)) participanteIds.push(alunoId);
    grupo.participantes = participanteIds;
    grupo.status = participanteIds.length >= maxParticipantes ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS;
    return grupo.save();
  });
}

async function populateInscricao(inscricaoId) {
  return InscricaoDesafio.findById(inscricaoId)
    .populate({
      path: "desafio",
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
    })
    .populate("turma")
    .populate({
      path: "grupo",
      populate: [
        {
          path: "desafio",
          populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
        },
        { path: "turma" },
        { path: "participantes", select: "name email role status" },
      ],
    })
    .lean();
}

async function subscribeToChallenge(authenticatedUserId, desafioId, payload = {}) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const modalidade = normalizeGroupMode(getFirstValue(payload, ["modalidade", "modalidadeGrupo", "groupMode"]));
  const lockKey = `${authenticatedUserId}:${id}`;

  return withLock(groupLocks, `subscription:${lockKey}`, async () => {
    const existing = await InscricaoDesafio.findOne({ aluno: authenticatedUserId, desafio: id, status: SUBSCRIPTION_STATUS }).lean();
    if (existing) {
      throw createHttpError("Aluno já está inscrito neste desafio.", 409, { code: "CHALLENGE_ALREADY_SUBSCRIBED" });
    }

    const [desafio, turmaId] = await Promise.all([getActiveDesafio(id), findStudentTurma(student)]);
    const grupo = await joinOrCreateGroup({ desafio, turmaId, alunoId: authenticatedUserId, modalidade });
    let inscricao;
    try {
      inscricao = await InscricaoDesafio.create({
        desafio: id,
        aluno: authenticatedUserId,
        turma: turmaId,
        grupo: getEntityId(grupo),
        modalidade,
        status: SUBSCRIPTION_STATUS,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      throw createHttpError("Aluno já está inscrito neste desafio.", 409, { code: "CHALLENGE_ALREADY_SUBSCRIBED" });
    }
    const populated = await populateInscricao(getEntityId(inscricao));
    return serializeInscricao(populated || inscricao);
  });
}

async function cancelSubscription(authenticatedUserId, inscricaoId) {
  await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(inscricaoId, "Inscrição deve ser um identificador válido.");
  const inscricao = await InscricaoDesafio.findOne({ _id: id, aluno: authenticatedUserId, status: SUBSCRIPTION_STATUS });
  if (!inscricao) throw createHttpError("Inscrição ativa não encontrada.", 404, { code: "SUBSCRIPTION_NOT_FOUND" });

  inscricao.status = "cancelado";
  inscricao.canceledAt = new Date();
  await inscricao.save();

  const grupoId = getEntityId(inscricao.grupo);
  if (grupoId && typeof GrupoDesafio.findById === "function") {
    const grupo = await GrupoDesafio.findById(grupoId);
    if (grupo && typeof grupo.save === "function") {
      grupo.participantes = (grupo.participantes || []).map(getEntityId).filter((alunoId) => alunoId !== authenticatedUserId);
      grupo.status = grupo.participantes.length === 0 ? "cancelado" : grupo.participantes.length >= Number(grupo.maxParticipantes || 1) ? COMPLETE_GROUP_STATUS : OPEN_GROUP_STATUS;
      await grupo.save();
    } else if (typeof GrupoDesafio.updateOne === "function") {
      await GrupoDesafio.updateOne({ _id: grupoId }, { $pull: { participantes: authenticatedUserId } });
    }
  }

  const populated = await populateInscricao(id);
  return serializeInscricao(populated || inscricao);
}

async function listMySubscriptions(authenticatedUserId) {
  await getAuthenticatedStudent(authenticatedUserId);
  await inactivateExpiredChallenges();
  const inscricoes = await InscricaoDesafio.find({ aluno: authenticatedUserId, status: SUBSCRIPTION_STATUS })
    .sort({ createdAt: -1 })
    .populate({
      path: "desafio",
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
    })
    .populate("turma")
    .populate({
      path: "grupo",
      populate: [
        {
          path: "desafio",
          populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
        },
        { path: "turma" },
        { path: "participantes", select: "name email role status" },
      ],
    })
    .lean();

  return {
    inscricoes: (inscricoes || [])
      .filter(
        (inscricao) =>
          inscricao.desafio &&
          normalizeText(inscricao.desafio.status) === ACTIVE_STATUS &&
          !isDeliveryDeadlineExpired(inscricao.desafio) &&
          (!inscricao.turma || typeof inscricao.turma !== "object" || normalizeText(inscricao.turma.status || ACTIVE_TURMA_STATUS) === ACTIVE_TURMA_STATUS)
      )
      .map(serializeInscricao),
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
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
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
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
    })
    .populate("turma")
    .populate("participantes", "name email role status")
    .lean();

  return serializeGrupo(result);
}

module.exports = {
  cancelSubscription,
  listGroups,
  listMySubscriptions,
  subscribeToChallenge,
  updateGroupContact,
};
