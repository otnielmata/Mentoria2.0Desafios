jest.mock("../../src/models/aluno-turma.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../src/models/desafio.model", () => ({
  findById: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../src/models/quiz-attempt.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/services/audit.service", () => ({
  logDomainEvent: jest.fn(),
}));

jest.mock("../../src/services/cupom.service", () => ({
  syncCouponsForStudents: jest.fn(),
}));

jest.mock("../../src/services/pontuacao.service", () => ({
  generatePontuacoesForApprovedEnvio: jest.fn(),
}));

jest.mock("../../src/services/desafio-prazo.service", () => ({
  getEffectiveChallengeStatus: jest.fn((desafio) => desafio.status),
  inactivateExpiredChallenges: jest.fn(),
  isDeliveryDeadlineExpired: jest.fn(() => false),
}));

const AlunoTurma = require("../../src/models/aluno-turma.model");
const Desafio = require("../../src/models/desafio.model");
const EnvioDesafio = require("../../src/models/envio-desafio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const QuizAttempt = require("../../src/models/quiz-attempt.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { generatePontuacoesForApprovedEnvio } = require("../../src/services/pontuacao.service");
const { answerQuizQuestion, getQuizState } = require("../../src/services/quiz.service");

const STUDENT_ID = "6814f12ab3f34872f7558f40";
const CHALLENGE_ID = "6814f12ab3f34872f7558f41";
const TURMA_ID = "6814f12ab3f34872f7558f42";
const QUESTION_1_ID = "6814f12ab3f34872f7558f43";
const QUESTION_2_ID = "6814f12ab3f34872f7558f44";
const PILAR_ID = "6814f12ab3f34872f7558f45";

function queryFor(value) {
  return {
    populate: jest.fn(() => queryFor(value)),
    sort: jest.fn(() => queryFor(value)),
    lean: jest.fn().mockResolvedValue(value),
  };
}

function buildChallenge() {
  return {
    _id: CHALLENGE_ID,
    title: "Questionário de segurança",
    description: "Responda para liberar o material.",
    deliveryDate: new Date("2099-01-01T00:00:00.000Z"),
    status: "ativo",
    points: 10,
    pilar: { _id: PILAR_ID, name: "Prática", status: "ativo" },
    pilares: [{ pilar: { _id: PILAR_ID, name: "Prática", status: "ativo" }, points: 10 }],
    challengeType: "quiz",
    quiz: {
      finalContentUrl: "https://example.com/ebook.pdf",
      questions: [
        {
          _id: QUESTION_1_ID,
          prompt: "Qual alternativa está correta?",
          alternatives: ["A", "B", "C", "D", "E"].map((text, index) => ({ _id: `${QUESTION_1_ID.slice(0, 23)}${index}`, text })),
          correctAlternative: 2,
        },
        {
          _id: QUESTION_2_ID,
          prompt: "Qual é a segunda resposta?",
          alternatives: ["F", "G", "H", "I", "J"].map((text, index) => ({ _id: `${QUESTION_2_ID.slice(0, 23)}${index}`, text })),
          correctAlternative: 4,
        },
      ],
    },
  };
}

describe("quiz.service", () => {
  let desafio;
  let tentativa;
  let score;
  let envio;

  beforeEach(() => {
    jest.clearAllMocks();
    desafio = buildChallenge();
    tentativa = {
      _id: "6814f12ab3f34872f7558f46",
      desafio: CHALLENGE_ID,
      aluno: STUDENT_ID,
      turma: TURMA_ID,
      currentQuestionIndex: 0,
      answers: [],
      status: "em_andamento",
      pointsAwarded: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };
    score = null;
    envio = { _id: "6814f12ab3f34872f7558f47", desafio: CHALLENGE_ID, turma: TURMA_ID, aluno: STUDENT_ID, status: "aprovado" };

    User.findById.mockReturnValue(queryFor({ _id: STUDENT_ID, role: "aluno", status: "ativo", turmas: [] }));
    AlunoTurma.findOne.mockReturnValue(queryFor({ turma: TURMA_ID }));
    Turma.findById.mockReturnValue(queryFor({ _id: TURMA_ID, status: "ativa" }));
    Desafio.findById.mockReturnValue(queryFor(desafio));
    Desafio.updateMany.mockResolvedValue({ acknowledged: true });
    QuizAttempt.findOne.mockResolvedValue(tentativa);
    QuizAttempt.create.mockResolvedValue(tentativa);
    EnvioDesafio.findOne.mockReturnValue(queryFor(null));
    EnvioDesafio.create.mockResolvedValue(envio);
    Pontuacao.findOne.mockImplementation(() => queryFor(score));
    generatePontuacoesForApprovedEnvio.mockImplementation(async () => {
      score = { _id: "6814f12ab3f34872f7558f48", envio: envio._id, aluno: STUDENT_ID, pontos: 10 };
    });
  });

  it("não expõe a resposta correta e só avança depois do acerto", async () => {
    const state = await getQuizState(STUDENT_ID, CHALLENGE_ID);

    expect(state.desafio.quiz.questions[0]).not.toHaveProperty("correctAlternative");
    expect(state.tentativa.currentQuestionIndex).toBe(0);

    const wrong = await answerQuizQuestion(STUDENT_ID, CHALLENGE_ID, {
      questionId: QUESTION_1_ID,
      alternativeIndex: 1,
    });
    expect(wrong.resultado).toEqual(expect.objectContaining({ correct: false, completed: false }));
    expect(wrong.tentativa.currentQuestionIndex).toBe(0);
    expect(wrong.resultado.message).toMatch(/incorreta/i);

    const right = await answerQuizQuestion(STUDENT_ID, CHALLENGE_ID, {
      questionId: QUESTION_1_ID,
      alternativeIndex: 2,
    });
    expect(right.resultado).toEqual(expect.objectContaining({ correct: true, completed: false }));
    expect(right.tentativa.currentQuestionIndex).toBe(1);
  });

  it("conclui uma tentativa, gera a pontuação e libera o conteúdo final", async () => {
    await answerQuizQuestion(STUDENT_ID, CHALLENGE_ID, { questionId: QUESTION_1_ID, alternativeIndex: 2 });
    const result = await answerQuizQuestion(STUDENT_ID, CHALLENGE_ID, { questionId: QUESTION_2_ID, alternativeIndex: 4 });

    expect(result.resultado).toEqual(expect.objectContaining({ correct: true, completed: true }));
    expect(result.tentativa.status).toBe("concluido");
    expect(result.tentativa.pointsAwarded).toBe(10);
    expect(result.conteudoFinal.url).toBe("https://example.com/ebook.pdf");
    expect(EnvioDesafio.create).toHaveBeenCalledWith(expect.objectContaining({ type: "individual", status: "aprovado" }));
    expect(generatePontuacoesForApprovedEnvio).toHaveBeenCalledWith(expect.anything(), desafio, [STUDENT_ID], { skipRecurrenceCheck: true });
  });
});
