jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { updateTurma } = require("../../src/services/turma.service");

const validTurmaId = "6814f12ab3f34872f7558f49";

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    ...overrides,
  };
}

function makeTurma(overrides = {}) {
  const turma = {
    _id: { toString: () => validTurmaId },
    name: "Turma Frontend",
    status: "ativa",
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };

  turma.save = jest.fn().mockImplementation(() => Promise.resolve(turma));
  return turma;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin edite nome, período e status de turma existente", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    const result = await updateTurma("admin-1", validTurmaId, {
      name: "  Turma Backend  ",
      startDate: "2026-09-01",
      endDate: "2026-10-01",
      status: " encerrada ",
    });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.findById).toHaveBeenCalledWith(validTurmaId);
    expect(turma.save).toHaveBeenCalledTimes(1);
    expect(turma.name).toBe("Turma Backend");
    expect(turma.status).toBe("encerrada");
    expect(turma.startDate).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(turma.endDate).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Backend",
      status: "encerrada",
      startDate: "2026-09-01T00:00:00.000Z",
      endDate: "2026-10-01T00:00:00.000Z",
    });
  });

  it("permite que professor edite apenas status preservando os demais dados", async () => {
    const turma = makeTurma({
      id: validTurmaId,
      name: "Turma Frontend",
      status: "ativa",
    });
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.findById.mockResolvedValue(turma);

    const result = await updateTurma("teacher-1", validTurmaId, {
      status: "pausada",
    });

    expect(turma.name).toBe("Turma Frontend");
    expect(turma.status).toBe("pausada");
    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Frontend",
      status: "pausada",
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
  });

  it("permite limpar datas enviando valores vazios", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    const result = await updateTurma("admin-1", validTurmaId, {
      startDate: "",
      endDate: null,
    });

    expect(turma.startDate).toBeUndefined();
    expect(turma.endDate).toBeUndefined();
    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Frontend",
      status: "ativa",
    });
  });

  it("rejeita data inicial posterior à data final quando ambas são informadas", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(
      updateTurma("admin-1", validTurmaId, {
        startDate: "2026-11-01",
        endDate: "2026-10-01",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Data inicial não pode ser posterior à data final.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("rejeita data inicial posterior à data final já existente", async () => {
    const turma = makeTurma({
      endDate: new Date("2026-08-01T00:00:00.000Z"),
    });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(
      updateTurma("admin-1", validTurmaId, {
        startDate: "2026-09-01",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Data inicial não pode ser posterior à data final.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("rejeita data inválida", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(
      updateTurma("admin-1", validTurmaId, {
        endDate: "data-invalida",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Data final inválida.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("rejeita payload sem campos editáveis", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(updateTurma("admin-1", validTurmaId, { ignored: true })).rejects.toMatchObject({
      statusCode: 400,
      message: "Informe ao menos um campo para atualizar.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("rejeita nome vazio", async () => {
    const turma = makeTurma();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(updateTurma("admin-1", validTurmaId, { name: "   " })).rejects.toMatchObject({
      statusCode: 400,
      message: "Nome deve ser um texto válido.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(updateTurma("student-1", validTurmaId, { status: "pausada" })).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode editar turmas.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(updateTurma("missing-user", validTurmaId, { status: "pausada" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 para id de turma inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(updateTurma("admin-1", "id-invalido", { status: "pausada" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(null);

    await expect(updateTurma("admin-1", validTurmaId, { status: "pausada" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });
  });

  it("retorna 404 quando turma está deletada", async () => {
    const turma = makeTurma({ deletedAt: new Date("2026-09-01T00:00:00.000Z") });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(updateTurma("admin-1", validTurmaId, { status: "ativa" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });
});
