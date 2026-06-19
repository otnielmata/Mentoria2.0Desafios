jest.mock("../../src/models/desafio.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/participante-envio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/services/audit.service", () => ({
  logDomainEvent: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const { logDomainEvent } = require("../../src/services/audit.service");
const { evaluateEnvio } = require("../../src/services/admin-envio-desafio.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ENVIO_ID = "6814f12ab3f34872f7558f41";
const DESAFIO_ID = "6814f12ab3f34872f7558f42";
const OWNER_ID = "6814f12ab3f34872f7558f43";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f44";

describe("admin-envio-desafio.service participantes_envio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    EnvioDesafio.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    ParticipanteEnvio.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ aluno: PARTICIPANT_ID }]),
    });
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Pontuacao.create.mockResolvedValue([]);
  });

  it("gera pontuação para responsável e participantes ativos da coleção ParticipanteEnvio", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega em grupo",
      type: "grupo",
      evidencias: ["https://exemplo.com"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" });

    expect(ParticipanteEnvio.find).toHaveBeenCalledWith({ envio: ENVIO_ID, status: "ativo" });
    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 20, motivo: "desafio_medio" }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 20, motivo: "desafio_medio" }),
    ]);
    expect(result.pontuacao).toEqual({
      pontos: 20,
      pontosPorPilar: [],
      geradas: 2,
      ignoradas: 0,
      alunos: [OWNER_ID, PARTICIPANT_ID],
      bonusLiderancaAplicado: false,
    });
    expect(logDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "envio_avaliado",
        actor: ADMIN_ID,
        aluno: OWNER_ID,
        desafio: DESAFIO_ID,
        statusAnterior: "pendente",
        statusNovo: "aprovado",
      })
    );
  });

  it("aprova envio com bônus de apresentação ao vivo para todos os integrantes", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, livePresentationPoints: 10, difficulty: "medio" },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega em grupo apresentada",
      type: "grupo",
      evidencias: ["https://exemplo.com/apresentacao"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado", apresentacaoAoVivo: true });

    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 30, motivo: "desafio_medio_apresentacao_ao_vivo" }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 30, motivo: "desafio_medio_apresentacao_ao_vivo" }),
    ]);
    expect(result.pontuacao).toMatchObject({
      pontos: 30,
      pontosBase: 20,
      bonusApresentacaoAoVivo: 10,
      geradas: 2,
      alunos: [OWNER_ID, PARTICIPANT_ID],
    });
    expect(result.envio.avaliacao).toMatchObject({ apresentacaoAoVivo: true });
  });

  it("aprova envio sem somar apresentação quando o checkbox não foi marcado", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, livePresentationPoints: 10, difficulty: "medio" },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega em grupo sem apresentação",
      type: "grupo",
      evidencias: ["https://exemplo.com/sem-apresentacao"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" });

    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 20, motivo: "desafio_medio" }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 20, motivo: "desafio_medio" }),
    ]);
    expect(result.pontuacao).toMatchObject({
      pontos: 20,
      geradas: 2,
      alunos: [OWNER_ID, PARTICIPANT_ID],
    });
    expect(result.pontuacao).not.toHaveProperty("bonusApresentacaoAoVivo");
    expect(result.envio.avaliacao).toMatchObject({ apresentacaoAoVivo: false });
  });

  it("bloqueia pontuação duplicada para mesma evidência, desafio e aluno", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega individual",
      type: "individual",
      evidencias: ["https://exemplo.com/comprovante.pdf"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);
    EnvioDesafio.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: "6814f12ab3f34872f7558f46",
          desafio: DESAFIO_ID,
          evidencias: [" https://exemplo.com/comprovante.pdf "],
          status: "aprovado",
        },
      ]),
    });
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ aluno: OWNER_ID, desafio: DESAFIO_ID, envio: "6814f12ab3f34872f7558f46" }]),
    });

    await expect(evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" })).rejects.toMatchObject({
      code: "DUPLICATE_EVIDENCE_SCORE",
      statusCode: 409,
      message: "Pontuação duplicada para a mesma evidência neste desafio.",
    });

    expect(envio.save).not.toHaveBeenCalled();
    expect(Pontuacao.create).not.toHaveBeenCalled();
  });

  it("bloqueia aprovação antes de salvar quando recorrência excede limite de pontos", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: {
        _id: DESAFIO_ID,
        points: 20,
        difficulty: "medio",
        recorrencia: { enabled: true, periodo: "mensal", limitePontos: 30 },
      },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega recorrente",
      type: "individual",
      evidencias: ["https://exemplo.com/recorrente.pdf"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ aluno: OWNER_ID, pontos: 20 }]),
    });

    await expect(evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" })).rejects.toMatchObject({
      code: "RECURRENCE_SCORE_LIMIT_EXCEEDED",
      statusCode: 409,
      message: "Limite de pontuação recorrente excedido para este desafio.",
    });

    expect(envio.save).not.toHaveBeenCalled();
    expect(Pontuacao.create).not.toHaveBeenCalled();
  });

  it("exige feedback para reprovar ou solicitar ajuste e não gera pontuação", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      aluno: OWNER_ID,
      type: "individual",
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    await expect(evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "ajuste" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Feedback é obrigatório para reprovar ou solicitar ajuste.",
    });

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, {
      decision: "reprovado",
      feedback: "Evidência não comprova a execução.",
    });

    expect(result.pontuacao).toBeNull();
    expect(Pontuacao.create).not.toHaveBeenCalled();
    expect(result.envio).toMatchObject({
      feedback: "Evidência não comprova a execução.",
      status: "reprovado",
    });
  });

  it("bloqueia reavaliação de envio já aprovado", async () => {
    EnvioDesafio.findById.mockResolvedValue({
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      aluno: OWNER_ID,
      type: "individual",
      status: "aprovado",
    });

    await expect(evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Envios aprovados não podem receber nova decisão.",
    });

    expect(Pontuacao.create).not.toHaveBeenCalled();
  });
});
