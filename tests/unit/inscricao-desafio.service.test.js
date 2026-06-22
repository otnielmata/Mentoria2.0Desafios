jest.mock("../../src/models/aluno-turma.model", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../src/models/desafio.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/grupo-desafio.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/inscricao-desafio.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const AlunoTurma = require("../../src/models/aluno-turma.model");
const Desafio = require("../../src/models/desafio.model");
const GrupoDesafio = require("../../src/models/grupo-desafio.model");
const InscricaoDesafio = require("../../src/models/inscricao-desafio.model");
const User = require("../../src/models/user.model");
const { subscribeToChallenge, updateGroupContact } = require("../../src/services/inscricao-desafio.service");

const STUDENT_ID = "6814f12ab3f34872f7558f40";
const DESAFIO_ID = "6814f12ab3f34872f7558f41";
const TURMA_ID = "6814f12ab3f34872f7558f42";
const GRUPO_ID = "6814f12ab3f34872f7558f43";
const INSCRICAO_ID = "6814f12ab3f34872f7558f44";

function mockLeanChain(modelMethod, value) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(value),
  };
  modelMethod.mockReturnValue(query);
  return query;
}

function desafioPayload() {
  return {
    _id: DESAFIO_ID,
    title: "Desafio em grupo",
    description: "Executar ação do método.",
    points: 20,
    maxParticipantes: 3,
    status: "ativo",
    pilar: { _id: "6814f12ab3f34872f7558f45", name: "Prática" },
  };
}

describe("inscricao-desafio.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeanChain(User.findById, { _id: STUDENT_ID, role: "aluno", status: "ativo", turmas: [] });
    mockLeanChain(AlunoTurma.findOne, { aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa" });
    mockLeanChain(Desafio.findById, desafioPayload());
    InscricaoDesafio.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  });

  it("inscreve aluno em desafio ativo e cria grupo automático quando não há grupo aberto", async () => {
    GrupoDesafio.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    GrupoDesafio.create.mockResolvedValue({
      _id: GRUPO_ID,
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      participantes: [STUDENT_ID],
      maxParticipantes: 3,
      modalidade: "normal",
      status: "formando",
    });
    InscricaoDesafio.create.mockResolvedValue({ _id: INSCRICAO_ID });
    mockLeanChain(InscricaoDesafio.findById, {
      _id: INSCRICAO_ID,
      desafio: desafioPayload(),
      turma: { _id: TURMA_ID, name: "Turma 1" },
      grupo: {
        _id: GRUPO_ID,
        desafio: desafioPayload(),
        turma: { _id: TURMA_ID, name: "Turma 1" },
        participantes: [{ _id: STUDENT_ID, name: "Ana", role: "aluno", status: "ativo" }],
        maxParticipantes: 3,
        status: "formando",
      },
      status: "inscrito",
    });

    const result = await subscribeToChallenge(STUDENT_ID, DESAFIO_ID);

    expect(GrupoDesafio.find).toHaveBeenCalledWith({
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      modalidade: { $in: ["normal", null] },
      status: "formando",
    });
    expect(GrupoDesafio.create).toHaveBeenCalledWith({
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      participantes: [STUDENT_ID],
      maxParticipantes: 3,
      modalidade: "normal",
      status: "formando",
    });
    expect(InscricaoDesafio.create).toHaveBeenCalledWith({
      desafio: DESAFIO_ID,
      aluno: STUDENT_ID,
      turma: TURMA_ID,
      grupo: GRUPO_ID,
      modalidade: "normal",
      status: "inscrito",
    });
    expect(result.grupo).toMatchObject({
      id: GRUPO_ID,
      totalParticipantes: 1,
      maxParticipantes: 3,
      modalidade: "normal",
      status: "formando",
    });
  });

  it("forma grupo de ingles separado dos grupos normais", async () => {
    GrupoDesafio.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    GrupoDesafio.create.mockResolvedValue({
      _id: GRUPO_ID,
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      participantes: [STUDENT_ID],
      maxParticipantes: 3,
      modalidade: "ingles",
      status: "formando",
    });
    InscricaoDesafio.create.mockResolvedValue({ _id: INSCRICAO_ID });
    mockLeanChain(InscricaoDesafio.findById, {
      _id: INSCRICAO_ID,
      desafio: desafioPayload(),
      turma: { _id: TURMA_ID, name: "Turma 1" },
      grupo: {
        _id: GRUPO_ID,
        desafio: desafioPayload(),
        turma: { _id: TURMA_ID, name: "Turma 1" },
        participantes: [{ _id: STUDENT_ID, name: "Ana", role: "aluno", status: "ativo" }],
        maxParticipantes: 3,
        modalidade: "ingles",
        status: "formando",
      },
      modalidade: "ingles",
      status: "inscrito",
    });

    const result = await subscribeToChallenge(STUDENT_ID, DESAFIO_ID, { modalidade: "ingles" });

    expect(GrupoDesafio.find).toHaveBeenCalledWith({
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      modalidade: "ingles",
      status: "formando",
    });
    expect(GrupoDesafio.create).toHaveBeenCalledWith(expect.objectContaining({ modalidade: "ingles" }));
    expect(InscricaoDesafio.create).toHaveBeenCalledWith(expect.objectContaining({ modalidade: "ingles" }));
    expect(result).toMatchObject({ modalidade: "ingles", grupo: { modalidade: "ingles" } });
  });

  it("rejeita modalidade de grupo desconhecida", async () => {
    await expect(subscribeToChallenge(STUDENT_ID, DESAFIO_ID, { modalidade: "outra" })).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  });

  it("bloqueia inscrição duplicada no mesmo desafio", async () => {
    InscricaoDesafio.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: INSCRICAO_ID }) });

    await expect(subscribeToChallenge(STUDENT_ID, DESAFIO_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: "CHALLENGE_ALREADY_SUBSCRIBED",
    });
  });

  it("permite participante atualizar contato do grupo", async () => {
    const grupoDocument = {
      _id: GRUPO_ID,
      participantes: [STUDENT_ID],
      save: jest.fn().mockResolvedValue({}),
    };
    GrupoDesafio.findById
      .mockReturnValueOnce(grupoDocument)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: GRUPO_ID,
          desafio: desafioPayload(),
          turma: { _id: TURMA_ID, name: "Turma 1" },
          participantes: [{ _id: STUDENT_ID, name: "Ana", role: "aluno", status: "ativo" }],
          maxParticipantes: 3,
          contato: { tipo: "discord", url: "https://discord.gg/grupo", updatedBy: STUDENT_ID, updatedAt: new Date("2026-01-01") },
          status: "formando",
        }),
      });

    const result = await updateGroupContact(STUDENT_ID, GRUPO_ID, {
      tipo: "discord",
      url: "https://discord.gg/grupo",
    });

    expect(grupoDocument.contato).toMatchObject({
      tipo: "discord",
      url: "https://discord.gg/grupo",
      updatedBy: STUDENT_ID,
    });
    expect(grupoDocument.save).toHaveBeenCalled();
    expect(result.contato).toMatchObject({ tipo: "discord", url: "https://discord.gg/grupo" });
  });
});
