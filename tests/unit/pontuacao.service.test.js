jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/participante-envio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/services/audit.service", () => ({
  logDomainEvent: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const { logDomainEvent } = require("../../src/services/audit.service");
const {
  assertNoDuplicateEvidenceScore,
  assertRecurringScoreLimit,
  generatePontuacoesForApprovedEnvio,
  shouldApplyLeadershipBonus,
} = require("../../src/services/pontuacao.service");

const ENVIO_ID = "6814f12ab3f34872f7558f41";
const DESAFIO_ID = "6814f12ab3f34872f7558f42";
const OWNER_ID = "6814f12ab3f34872f7558f43";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f44";
const LEGACY_PARTICIPANT_ID = "6814f12ab3f34872f7558f45";

function mockLean(modelMethod, value) {
  modelMethod.mockReturnValue({
    lean: jest.fn().mockResolvedValue(value),
  });
}

describe("pontuacao.service MR-94", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLean(EnvioDesafio.find, []);
    mockLean(ParticipanteEnvio.find, []);
    mockLean(Pontuacao.find, []);
    Pontuacao.create.mockResolvedValue([]);
  });

  it("não gera pontuação para envio pendente, reprovado ou em ajuste", async () => {
    await expect(
      generatePontuacoesForApprovedEnvio(
        { _id: ENVIO_ID, aluno: OWNER_ID, status: "pendente", type: "individual" },
        { _id: DESAFIO_ID, points: 10 }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Pontuação só pode ser gerada para envio aprovado.",
    });

    expect(Pontuacao.find).not.toHaveBeenCalled();
    expect(Pontuacao.create).not.toHaveBeenCalled();
  });

  it("gera pontuação individual com pontos fixos do desafio aprovado", async () => {
    const result = await generatePontuacoesForApprovedEnvio(
      { _id: ENVIO_ID, aluno: OWNER_ID, status: "aprovado", type: "individual" },
      { _id: DESAFIO_ID, points: 30, difficulty: "dificil" }
    );

    expect(ParticipanteEnvio.find).not.toHaveBeenCalled();
    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({
        aluno: OWNER_ID,
        desafio: DESAFIO_ID,
        envio: ENVIO_ID,
        pontos: 30,
        motivo: "desafio_dificil",
        source: "envio_desafio",
      }),
    ]);
    expect(result).toEqual({
      pontos: 30,
      geradas: 1,
      ignoradas: 0,
      alunos: [OWNER_ID],
      bonusLiderancaAplicado: false,
    });
    expect(logDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "pontuacao_gerada",
        aluno: OWNER_ID,
        desafio: DESAFIO_ID,
        envio: ENVIO_ID,
        metadata: expect.objectContaining({ pontos: 30, motivo: "desafio_dificil" }),
      })
    );
  });

  it("gera pontuação para responsável e participantes válidos do grupo sem duplicar aluno", async () => {
    mockLean(ParticipanteEnvio.find, [{ aluno: PARTICIPANT_ID }, { aluno: OWNER_ID }]);

    const result = await generatePontuacoesForApprovedEnvio(
      {
        _id: ENVIO_ID,
        aluno: OWNER_ID,
        status: "aprovado",
        type: "grupo",
        participantes: [LEGACY_PARTICIPANT_ID, PARTICIPANT_ID],
      },
      { _id: DESAFIO_ID, points: 20, difficulty: "medio" }
    );

    expect(ParticipanteEnvio.find).toHaveBeenCalledWith({ envio: ENVIO_ID, status: "ativo" });
    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 20 }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 20 }),
      expect.objectContaining({ aluno: LEGACY_PARTICIPANT_ID, pontos: 20 }),
    ]);
    expect(result).toMatchObject({
      pontos: 20,
      geradas: 3,
      ignoradas: 0,
      alunos: [OWNER_ID, PARTICIPANT_ID, LEGACY_PARTICIPANT_ID],
      bonusLiderancaAplicado: false,
    });
  });

  it("soma bônus de apresentação ao vivo para todos os participantes aprovados", async () => {
    mockLean(ParticipanteEnvio.find, [{ aluno: PARTICIPANT_ID }]);

    const result = await generatePontuacoesForApprovedEnvio(
      {
        _id: ENVIO_ID,
        aluno: OWNER_ID,
        status: "aprovado",
        type: "grupo",
        participantes: [],
      },
      { _id: DESAFIO_ID, points: 20, livePresentationPoints: 10, difficulty: "medio" },
      undefined,
      { apresentacaoAoVivo: true }
    );

    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 30, motivo: "desafio_medio_apresentacao_ao_vivo" }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 30, motivo: "desafio_medio_apresentacao_ao_vivo" }),
    ]);
    expect(result).toMatchObject({
      pontos: 30,
      pontosBase: 20,
      bonusApresentacaoAoVivo: 10,
      geradas: 2,
      alunos: [OWNER_ID, PARTICIPANT_ID],
    });
  });

  it("não aplica bônus de liderança enquanto a configuração do MVP estiver desligada", () => {
    expect(shouldApplyLeadershipBonus()).toBe(false);
  });

  it("bloqueia nova pontuação quando a mesma evidência já pontuou o aluno no desafio", async () => {
    mockLean(EnvioDesafio.find, [
      {
        _id: "6814f12ab3f34872f7558f46",
        desafio: DESAFIO_ID,
        evidencias: [" https://exemplo.com/evidencia.pdf "],
        status: "aprovado",
      },
    ]);
    mockLean(Pontuacao.find, [{ aluno: OWNER_ID, desafio: DESAFIO_ID, envio: "6814f12ab3f34872f7558f46" }]);

    await expect(
      assertNoDuplicateEvidenceScore(
        {
          _id: ENVIO_ID,
          desafio: DESAFIO_ID,
          aluno: OWNER_ID,
          evidencias: ["https://exemplo.com/evidencia.pdf"],
        },
        { _id: DESAFIO_ID },
        [OWNER_ID]
      )
    ).rejects.toMatchObject({
      code: "DUPLICATE_EVIDENCE_SCORE",
      statusCode: 409,
      message: "Pontuação duplicada para a mesma evidência neste desafio.",
    });
  });

  it("bloqueia pontuação quando desafio recorrente excede limite de pontos no período", async () => {
    mockLean(Pontuacao.find, [{ aluno: OWNER_ID, pontos: 20 }]);

    await expect(
      assertRecurringScoreLimit(
        { _id: ENVIO_ID, aluno: OWNER_ID },
        {
          _id: DESAFIO_ID,
          points: 20,
          recorrencia: { enabled: true, periodo: "mensal", limitePontos: 30 },
        },
        [OWNER_ID],
        new Date("2026-01-15T10:00:00.000Z")
      )
    ).rejects.toMatchObject({
      code: "RECURRENCE_SCORE_LIMIT_EXCEEDED",
      statusCode: 409,
      message: "Limite de pontuação recorrente excedido para este desafio.",
    });

    expect(Pontuacao.find).toHaveBeenCalledWith({
      envio: { $ne: ENVIO_ID },
      desafio: DESAFIO_ID,
      aluno: { $in: [OWNER_ID] },
      createdAt: {
        $gte: new Date("2026-01-01T00:00:00.000Z"),
        $lt: new Date("2026-02-01T00:00:00.000Z"),
      },
    });
    expect(Pontuacao.create).not.toHaveBeenCalled();
  });
});
