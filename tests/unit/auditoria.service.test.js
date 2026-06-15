jest.mock("../../src/models/audit-event.model", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/models/auth-attempt.model", () => ({
  create: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const AuditEvent = require("../../src/models/audit-event.model");
const User = require("../../src/models/user.model");
const { listAuditEvents } = require("../../src/services/auditoria.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ALUNO_ID = "6814f12ab3f34872f7558f41";
const ENVIO_ID = "6814f12ab3f34872f7558f42";

function mockAuditFind(events) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(events),
  };
  AuditEvent.find.mockReturnValue(query);
  return query;
}

describe("auditoria.service MR-96", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    AuditEvent.countDocuments.mockResolvedValue(1);
    mockAuditFind([]);
  });

  it("lista histórico auditável sem senha, token, hash ou segredos", async () => {
    mockAuditFind([
      {
        _id: "6814f12ab3f34872f7558f43",
        eventType: "envio_avaliado",
        actor: { _id: ADMIN_ID, name: "Admin", email: "admin@email.com", role: "admin", password: "secret" },
        aluno: { _id: ALUNO_ID, name: "Aluno", email: "aluno@email.com", role: "aluno", passwordHash: "hash" },
        envio: { _id: ENVIO_ID, status: "aprovado", type: "individual" },
        statusAnterior: "pendente",
        statusNovo: "aprovado",
        feedback: "OK",
        metadata: { token: "secret", motivo: "aprovacao" },
        occurredAt: new Date("2026-01-15T10:00:00.000Z"),
        createdAt: new Date("2026-01-15T10:00:01.000Z"),
      },
    ]);

    const result = await listAuditEvents(ADMIN_ID, {
      evento: "envio_avaliado",
      alunoId: ALUNO_ID,
      envioId: ENVIO_ID,
      page: "1",
      limit: "10",
    });

    expect(AuditEvent.find).toHaveBeenCalledWith({
      eventType: "envio_avaliado",
      aluno: ALUNO_ID,
      envio: ENVIO_ID,
    });
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.eventos[0]).toMatchObject({
      eventType: "envio_avaliado",
      actor: { id: ADMIN_ID, role: "admin" },
      aluno: { id: ALUNO_ID, role: "aluno" },
      envio: { id: ENVIO_ID, status: "aprovado" },
      metadata: { motivo: "aprovacao" },
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("hash");
    expect(JSON.stringify(result)).not.toContain("token");
  });

  it("bloqueia consulta para perfil sem permissão", async () => {
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "aluno" });

    await expect(listAuditEvents(ADMIN_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode consultar auditoria.",
    });
  });
});
