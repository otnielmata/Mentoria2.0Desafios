const AlunoTurma = require("../models/aluno-turma.model");
const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const QuizAttempt = require("../models/quiz-attempt.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const { logDomainEvent } = require("./audit.service");
const { syncCouponsForStudents } = require("./cupom.service");
const { generatePontuacoesForApprovedEnvio } = require("./pontuacao.service");
const { getEffectiveChallengeStatus, inactivateExpiredChallenges, isDeliveryDeadlineExpired } = require("./desafio-prazo.service");
const {
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  toIsoDate,
} = require("./domain-utils");

const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const ACTIVE_TURMA_STATUS = "ativa";
const QUIZ_STATUS = "quiz";
const ATTEMPT_IN_PROGRESS = "em_andamento";
const ATTEMPT_COMPLETED = "concluido";
const APPROVED_STATUS = "aprovado";
const quizLocks = new Map();

function withLock(key, task) {
  const previous = quizLocks.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  quizLocks.set(key, current);
  return current.finally(() => {
    if (quizLocks.get(key) === current) quizLocks.delete(key);
  });
}

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.codeName === "DuplicateKey"));
}

async function resolveQuery(query) {
  return query && typeof query.lean === "function" ? query.lean() : query;
}

function isQuizChallenge(desafio) {
  return normalizeText(desafio && desafio.challengeType) === QUIZ_STATUS || Boolean(desafio && desafio.quiz && Array.isArray(desafio.quiz.questions));
}

function serializePilar(pilar) {
  if (!pilar) return null;
  if (typeof pilar !== "object") return { id: getEntityId(pilar) };
  return {
    id: getEntityId(pilar),
    name: pilar.name,
    description: pilar.description,
    status: pilar.status,
  };
}

function getChallengePillars(desafio) {
  const configured = Array.isArray(desafio && desafio.pilares)
    ? desafio.pilares
        .map((item) => {
          const pilar = item && (item.pilar || item.pilarId || item.id);
          const points = Number(item && (item.points || item.pontos || 0));
          return pilar && Number.isFinite(points) ? { pilar: serializePilar(pilar), pilarId: getEntityId(pilar), points, pontos: points } : null;
        })
        .filter(Boolean)
    : [];
  if (configured.length > 0) return configured;

  const legacyPoints = Number(desafio && desafio.points);
  const legacyPilar = desafio && desafio.pilar;
  return legacyPilar && Number.isFinite(legacyPoints) && legacyPoints > 0
    ? [{ pilar: serializePilar(legacyPilar), pilarId: getEntityId(legacyPilar), points: legacyPoints, pontos: legacyPoints }]
    : [];
}

function serializeQuestion(question) {
  const alternatives = Array.isArray(question && question.alternatives)
    ? question.alternatives.map((alternative, index) => ({
        id: alternative && (alternative.id || alternative._id) ? getEntityId(alternative) : String(index),
        text: alternative && (alternative.text || alternative.texto),
        texto: alternative && (alternative.text || alternative.texto),
      }))
    : [];
  const prompt = question && (question.prompt || question.question || question.enunciado);
  const questionId = question && (question.id || question._id);
  return {
    id: questionId ? getEntityId(question) : "",
    prompt,
    question: prompt,
    enunciado: prompt,
    alternatives,
    alternativas: alternatives,
  };
}

function serializeQuizChallenge(desafio) {
  const questions = Array.isArray(desafio && desafio.quiz && desafio.quiz.questions)
    ? desafio.quiz.questions.map(serializeQuestion)
    : [];
  const pillars = getChallengePillars(desafio);
  const points = Number(desafio && desafio.points) || pillars.reduce((total, item) => total + Number(item.points || 0), 0);
  return {
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    deliveryDate: toIsoDate(desafio.deliveryDate),
    dataEntrega: toIsoDate(desafio.deliveryDate),
    points,
    pontos: points,
    pilar: desafio.pilar ? serializePilar(desafio.pilar) : pillars[0] && pillars[0].pilar,
    pilarId: getEntityId(desafio.pilar) || (pillars[0] && pillars[0].pilarId),
    pilares: pillars,
    pontosPorPilar: pillars,
    type: "individual",
    maxParticipantes: 1,
    status: getEffectiveChallengeStatus(desafio),
    challengeType: QUIZ_STATUS,
    tipoDesafio: QUIZ_STATUS,
    quiz: {
      enabled: true,
      questions,
      perguntas: questions,
      questionCount: questions.length,
      quantidadePerguntas: questions.length,
    },
  };
}

function serializeAttempt(attempt, totalQuestions) {
  const currentQuestionIndex = Math.min(Number(attempt.currentQuestionIndex || 0), totalQuestions);
  const answers = Array.isArray(attempt.answers)
    ? attempt.answers.map((answer) => ({
        id: getEntityId(answer),
        questionId: String(answer.questionId),
        perguntaId: String(answer.questionId),
        selectedAlternative: Number(answer.selectedAlternative),
        alternativaSelecionada: Number(answer.selectedAlternative),
        correct: answer.correct === true,
        correta: answer.correct === true,
        answeredAt: toIsoDate(answer.answeredAt),
      }))
    : [];
  return {
    id: getEntityId(attempt),
    status: attempt.status,
    currentQuestionIndex,
    indicePerguntaAtual: currentQuestionIndex,
    totalQuestions,
    quantidadePerguntas: totalQuestions,
    answers,
    respostas: answers,
    pointsAwarded: Number(attempt.pointsAwarded || 0),
    pontosConquistados: Number(attempt.pointsAwarded || 0),
    completedAt: toIsoDate(attempt.completedAt),
    concluidaEm: toIsoDate(attempt.completedAt),
  };
}

function buildResult({ correct, completed = false, message }) {
  return {
    correct,
    correta: correct,
    completed,
    concluida: completed,
    message,
  };
}

function buildResponse(desafio, tentativa, result = null) {
  const completed = tentativa.status === ATTEMPT_COMPLETED;
  const finalUrl = completed && desafio.quiz ? desafio.quiz.finalContentUrl : null;
  return {
    desafio: serializeQuizChallenge(desafio),
    tentativa: serializeAttempt(tentativa, desafio.quiz.questions.length),
    resultado: result,
    result,
    conteudoFinal: finalUrl
      ? {
          url: finalUrl,
          link: finalUrl,
          finalContentUrl: finalUrl,
          linkConteudoFinal: finalUrl,
        }
      : null,
  };
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const user = await resolveQuery(User.findById(authenticatedUserId));
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError("Apenas aluno pode responder questionários.", 403);
  if (normalizeText(user.status || ACTIVE_STATUS) !== ACTIVE_STATUS) {
    throw createHttpError("Aluno inativo não pode responder questionários.", 403, { code: "INACTIVE_USER" });
  }
  return user;
}

async function findActiveTurmaId(turma) {
  const turmaId = getEntityId(turma);
  if (!turmaId) return null;
  const turmaRecord = await resolveQuery(Turma.findById(turmaId));
  return turmaRecord && normalizeText(turmaRecord.status || ACTIVE_TURMA_STATUS) === ACTIVE_TURMA_STATUS ? turmaId : null;
}

async function findStudentTurma(student) {
  const linkQuery = AlunoTurma.findOne({ aluno: getEntityId(student), status: ACTIVE_TURMA_STATUS });
  const activeLink = linkQuery && typeof linkQuery.sort === "function"
    ? await resolveQuery(linkQuery.sort({ createdAt: -1 }))
    : await resolveQuery(linkQuery);
  if (activeLink && activeLink.turma) {
    const turmaId = await findActiveTurmaId(activeLink.turma);
    if (turmaId) return turmaId;
  }

  for (const turma of Array.isArray(student.turmas) ? student.turmas : []) {
    const turmaId = await findActiveTurmaId(turma);
    if (turmaId) return turmaId;
  }

  throw createHttpError("Aluno precisa estar vinculado a uma turma ativa para responder questionários.", 400, {
    code: "STUDENT_CLASS_REQUIRED",
  });
}

async function getActiveQuizChallenge(desafioId) {
  await inactivateExpiredChallenges();
  const desafio = await resolveQuery(
    Desafio.findById(desafioId).populate([{ path: "pilar" }, { path: "pilares.pilar" }])
  );
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  if (!isQuizChallenge(desafio)) throw createHttpError("Este desafio não é um questionário.", 400, { code: "NOT_A_QUIZ" });
  if (getEffectiveChallengeStatus(desafio) !== ACTIVE_STATUS || isDeliveryDeadlineExpired(desafio)) {
    throw createHttpError("O prazo deste questionário foi encerrado.", 400, { code: "QUIZ_CLOSED" });
  }
  const pillarRefs = [
    desafio.pilar,
    ...(Array.isArray(desafio.pilares) ? desafio.pilares.map((item) => item && item.pilar) : []),
  ].filter(Boolean);
  if (pillarRefs.some((pilar) => normalizeText(pilar.status || ACTIVE_STATUS) !== ACTIVE_STATUS)) {
    throw createHttpError("Apenas questionários vinculados a pilares ativos podem ser respondidos.", 400, { code: "INACTIVE_PILAR" });
  }
  if (!Array.isArray(desafio.quiz && desafio.quiz.questions) || desafio.quiz.questions.length === 0) {
    throw createHttpError("Este questionário ainda não possui perguntas cadastradas.", 409, { code: "QUIZ_WITHOUT_QUESTIONS" });
  }
  return desafio;
}

async function getOrCreateAttempt(desafio, studentId, turmaId) {
  // A tentativa precisa ser um documento Mongoose para que o avanço de pergunta seja salvo.
  let attempt = await QuizAttempt.findOne({ desafio: getEntityId(desafio), aluno: studentId });
  if (attempt) return attempt;

  try {
    attempt = await QuizAttempt.create({
      desafio: getEntityId(desafio),
      aluno: studentId,
      turma: turmaId,
      currentQuestionIndex: 0,
      answers: [],
      status: ATTEMPT_IN_PROGRESS,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    attempt = await QuizAttempt.findOne({ desafio: getEntityId(desafio), aluno: studentId });
  }
  if (!attempt) throw createHttpError("Não foi possível iniciar o questionário.", 500);
  return attempt;
}

async function saveAttempt(attempt) {
  if (attempt && typeof attempt.save === "function") return attempt.save();
  return attempt;
}

async function getQuizState(authenticatedUserId, desafioId) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const desafio = await getActiveQuizChallenge(id);
  const turmaId = await findStudentTurma(student);
  const tentativa = await getOrCreateAttempt(desafio, getEntityId(student), turmaId);
  return buildResponse(desafio, tentativa);
}

async function findExistingQuizSubmission(desafioId, studentId, attemptId) {
  if (typeof EnvioDesafio.findOne !== "function") return null;
  return resolveQuery(
    EnvioDesafio.findOne({
      desafio: desafioId,
      aluno: studentId,
      "avaliacao.tentativa": attemptId,
      status: APPROVED_STATUS,
    })
  );
}

async function findExistingQuizScore(envioId, studentId) {
  if (typeof Pontuacao.findOne !== "function") return null;
  return resolveQuery(Pontuacao.findOne({ envio: envioId, aluno: studentId }));
}

async function completeQuiz({ desafio, tentativa, studentId, turmaId }) {
  const desafioId = getEntityId(desafio);
  const tentativaId = getEntityId(tentativa);
  let envio = await findExistingQuizSubmission(desafioId, studentId, tentativaId);
  if (!envio) {
    envio = await EnvioDesafio.create({
      desafio: desafioId,
      turma: turmaId,
      aluno: studentId,
      description: "Questionário concluído automaticamente.",
      type: "individual",
      evidencias: [],
      anexos: [],
      participantes: [],
      status: APPROVED_STATUS,
      avaliacao: { tipo: "questionario", tentativa: tentativaId },
      evaluatedAt: new Date(),
      approvedAt: new Date(),
    });
  }

  const envioId = getEntityId(envio);
  let pontuacao = await findExistingQuizScore(envioId, studentId);
  if (!pontuacao) {
    await generatePontuacoesForApprovedEnvio(envio, desafio, [studentId], { skipRecurrenceCheck: true });
    pontuacao = await findExistingQuizScore(envioId, studentId);
  }

  const points = Number((pontuacao && pontuacao.pontos) || desafio.points || 0);
  tentativa.status = ATTEMPT_COMPLETED;
  tentativa.currentQuestionIndex = desafio.quiz.questions.length;
  tentativa.completedAt = tentativa.completedAt || new Date();
  tentativa.pointsAwarded = points;
  tentativa.envio = envioId;
  tentativa.pontuacao = pontuacao ? getEntityId(pontuacao) : null;
  await saveAttempt(tentativa);

  await logDomainEvent({
    eventType: "questionario_concluido",
    actor: studentId,
    aluno: studentId,
    desafio: desafioId,
    envio: envioId,
    turma: turmaId,
    pontuacao: pontuacao ? getEntityId(pontuacao) : null,
    statusNovo: ATTEMPT_COMPLETED,
    metadata: {
      tipo: "questionario",
      pontos: points,
      quantidadePerguntas: desafio.quiz.questions.length,
    },
    occurredAt: tentativa.completedAt,
  });
  await syncCouponsForStudents([studentId], { occurredAt: tentativa.completedAt });

  return { envio, pontuacao };
}

async function answerQuizQuestion(authenticatedUserId, desafioId, payload = {}) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const questionIdValue = getFirstValue(payload, ["questionId", "perguntaId", "question", "pergunta"]);
  const rawAlternative = getFirstValue(payload, ["alternativeIndex", "indiceAlternativa", "respostaIndex", "alternativa", "resposta"]);
  if (questionIdValue === undefined || questionIdValue === null || String(questionIdValue).trim() === "") {
    throw createHttpError("Informe a pergunta que está sendo respondida.", 400, { code: "QUESTION_REQUIRED" });
  }
  if (rawAlternative === undefined || rawAlternative === null || rawAlternative === "") {
    throw createHttpError("Selecione uma alternativa.", 400, { code: "ANSWER_REQUIRED" });
  }
  const alternativeIndex = Number(rawAlternative);
  if (!Number.isInteger(alternativeIndex) || alternativeIndex < 0 || alternativeIndex > 4) {
    throw createHttpError("A alternativa selecionada é inválida.", 400, { code: "ANSWER_INVALID" });
  }

  const studentId = getEntityId(student);
  return withLock(`${studentId}:${id}`, async () => {
    const desafio = await getActiveQuizChallenge(id);
    const turmaId = await findStudentTurma(student);
    const tentativa = await getOrCreateAttempt(desafio, studentId, turmaId);
    if (tentativa.status === ATTEMPT_COMPLETED) {
      return buildResponse(desafio, tentativa, buildResult({ correct: true, completed: true, message: "Questionário já concluído." }));
    }

    const questions = desafio.quiz.questions;
    const currentIndex = Number(tentativa.currentQuestionIndex || 0);
    const currentQuestion = questions[currentIndex];
    const questionId = String(questionIdValue).trim();
    if (!currentQuestion || getEntityId(currentQuestion) !== questionId) {
      throw createHttpError("Responda a pergunta atual antes de avançar.", 409, { code: "QUESTION_NOT_CURRENT" });
    }

    const correct = alternativeIndex === Number(currentQuestion.correctAlternative);
    tentativa.answers = Array.isArray(tentativa.answers) ? tentativa.answers : [];
    tentativa.answers.push({
      questionId,
      selectedAlternative: alternativeIndex,
      correct,
      answeredAt: new Date(),
    });

    if (!correct) {
      await saveAttempt(tentativa);
      return buildResponse(desafio, tentativa, buildResult({ correct: false, message: "Resposta incorreta. Tente novamente." }));
    }

    if (currentIndex < questions.length - 1) {
      tentativa.currentQuestionIndex = currentIndex + 1;
      await saveAttempt(tentativa);
      return buildResponse(desafio, tentativa, buildResult({ correct: true, message: "Resposta correta! Próxima pergunta liberada." }));
    }

    await completeQuiz({ desafio, tentativa, studentId, turmaId });
    return buildResponse(desafio, tentativa, buildResult({ correct: true, completed: true, message: "Questionário concluído!" }));
  });
}

module.exports = {
  answerQuizQuestion,
  getQuizState,
};
