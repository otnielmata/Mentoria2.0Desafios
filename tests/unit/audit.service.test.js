jest.mock("../../src/models/audit-event.model", () => ({
  create: jest.fn(),
}));

jest.mock("../../src/models/auth-attempt.model", () => ({
  create: jest.fn(),
}));

const AuditEvent = require("../../src/models/audit-event.model");
const { logDomainEvent, sanitizeMetadata } = require("../../src/services/audit.service");

describe("audit.service MR-96", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditEvent.create.mockResolvedValue({});
  });

  it("remove dados sensíveis do metadata antes de registrar auditoria", () => {
    expect(
      sanitizeMetadata({
        action: "teste",
        password: "secret",
        nested: {
          token: "abc",
          value: 10,
          passwordHash: "hash",
        },
      })
    ).toEqual({
      action: "teste",
      nested: {
        value: 10,
      },
    });
  });

  it("registra evento de domínio com campos de rastreabilidade", async () => {
    const occurredAt = new Date("2026-01-15T10:00:00.000Z");

    await logDomainEvent({
      eventType: "envio_avaliado",
      actor: "6814f12ab3f34872f7558f40",
      aluno: "6814f12ab3f34872f7558f41",
      desafio: "6814f12ab3f34872f7558f42",
      envio: "6814f12ab3f34872f7558f43",
      statusAnterior: "pendente",
      statusNovo: "aprovado",
      feedback: "OK",
      metadata: { token: "secret", motivo: "aprovacao" },
      occurredAt,
    });

    expect(AuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "envio_avaliado",
        actor: "6814f12ab3f34872f7558f40",
        aluno: "6814f12ab3f34872f7558f41",
        desafio: "6814f12ab3f34872f7558f42",
        envio: "6814f12ab3f34872f7558f43",
        statusAnterior: "pendente",
        statusNovo: "aprovado",
        feedback: "OK",
        metadata: { motivo: "aprovacao" },
        occurredAt,
      })
    );
  });
});
