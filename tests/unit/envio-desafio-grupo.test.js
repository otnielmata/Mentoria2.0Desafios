jest.mock("../../src/models/aluno-turma.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/desafio.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/grupo-desafio.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/participante-envio.model", () => ({
  create: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/services/audit.service", () => ({
  logDomainEvent: jest.fn(),
}));

const AlunoTurma = require("../../src/models/aluno-turma.model");
const Desafio = require("../../src/models/desafio.model");
const EnvioDesafio = require("../../src/models/envio-desafio.model");
const GrupoDesafio = require("../../src/models/grupo-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { logDomainEvent } = require("../../src/services/audit.service");
const { createEnvioDesafio, listMine, updateEnvio } = require("../../src/services/envio-desafio.service");

const STUDENT_ID = "6814f12ab3f34872f7558f40";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f41";
const SECOND_PARTICIPANT_ID = "6814f12ab3f34872f7558f42";
const DESAFIO_ID = "6814f12ab3f34872f7558f43";
const TURMA_ID = "6814f12ab3f34872f7558f44";
const GRUPO_ID = "6814f12ab3f34872f7558f4a";

function mockGrupoFindById(grupo) {
  const query = {
    populate: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(grupo),
  };
  GrupoDesafio.findById.mockReturnValue(query);
  return query;
}

describe("envio-desafio.service grupos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
    EnvioDesafio.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      status: "ativo",
      deliveryDate: "2099-01-01T00:00:00.000Z",
      type: "grupo",
      maxParticipantes: 2,
    });
    Desafio.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
  });

  it("cria envio individual pendente com aluno autenticado como responsável e líder", async () => {
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      status: "ativo",
      type: "individual",
      maxParticipantes: 1,
    });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    ParticipanteEnvio.updateMany.mockResolvedValue({});
    EnvioDesafio.create.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      description: "Entrega individual com evidência",
      type: "individual",
      evidencias: ["https://evidencia.com"],
      participantes: [],
      status: "pendente",
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
      desafioId: DESAFIO_ID,
      turmaId: TURMA_ID,
      type: "individual",
      description: "Entrega individual com evidência",
      evidencias: ["https://evidencia.com"],
    });

    expect(EnvioDesafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aluno: STUDENT_ID,
        status: "pendente",
        type: "individual",
      })
    );
    expect(result).toMatchObject({
      alunoId: STUDENT_ID,
      liderId: STUDENT_ID,
      responsavelId: STUDENT_ID,
      status: "pendente",
      totalParticipantes: 1,
    });
    expect(logDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "envio_criado",
        actor: STUDENT_ID,
        aluno: STUDENT_ID,
        desafio: DESAFIO_ID,
        turma: TURMA_ID,
        statusNovo: "pendente",
      })
    );
  });

  it("cria envio sem evidência quando a descrição obrigatória foi informada", async () => {
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      status: "ativo",
      type: "individual",
      maxParticipantes: 1,
    });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    EnvioDesafio.create.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      description: "Entrega sem comprovante",
      type: "individual",
      evidencias: [],
      participantes: [],
      status: "pendente",
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
        desafioId: DESAFIO_ID,
        turmaId: TURMA_ID,
        type: "individual",
        description: "Entrega sem comprovante",
    });

    expect(EnvioDesafio.create).toHaveBeenCalledWith(expect.objectContaining({ evidencias: [], anexos: [] }));
    expect(result).toMatchObject({ status: "pendente", evidencias: [] });
  });

  it("rejeita participantes duplicados em envio de grupo", async () => {
    await expect(
      createEnvioDesafio(STUDENT_ID, {
        desafioId: DESAFIO_ID,
        turmaId: TURMA_ID,
        type: "grupo",
        description: "Entrega em grupo",
        evidencias: ["https://evidencia.com"],
        participantes: [PARTICIPANT_ID, PARTICIPANT_ID],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Participantes não podem conter duplicidades.",
    });

    expect(EnvioDesafio.create).not.toHaveBeenCalled();
  });

  it("cria envio em grupo com até 5 participantes ativos da mesma turma", async () => {
    const participantes = [
      PARTICIPANT_ID,
      SECOND_PARTICIPANT_ID,
      "6814f12ab3f34872f7558f46",
      "6814f12ab3f34872f7558f47",
      "6814f12ab3f34872f7558f48",
    ];
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      status: "ativo",
      type: "grupo",
      maxParticipantes: 5,
    });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    User.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(participantes.map((participante) => ({ _id: participante, role: "aluno", status: "ativo" }))),
    });
    AlunoTurma.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue(participantes.map((participante) => ({ aluno: participante, turma: TURMA_ID, status: "ativa" }))),
    });
    EnvioDesafio.create.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      description: "Entrega em grupo",
      type: "grupo",
      evidencias: ["https://evidencia.com"],
      participantes,
      status: "pendente",
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
      desafioId: DESAFIO_ID,
      turmaId: TURMA_ID,
      type: "grupo",
      description: "Entrega em grupo",
      evidencias: ["https://evidencia.com"],
      participantes,
    });

    expect(AlunoTurma.find).toHaveBeenCalledWith({
      turma: TURMA_ID,
      aluno: { $in: participantes },
      status: "ativa",
    });
    expect(ParticipanteEnvio.updateMany).toHaveBeenCalledWith(
      { envio: "6814f12ab3f34872f7558f45", status: "ativo" },
      { status: "removido", removedAt: expect.any(Date) }
    );
    expect(ParticipanteEnvio.create).toHaveBeenCalledWith(
      participantes.map((participante) => ({
        envio: "6814f12ab3f34872f7558f45",
        aluno: participante,
        status: "ativo",
      }))
    );
    expect(result.status).toBe("pendente");
  });

  it("envia desafio a partir de grupo formado por inscrição automática", async () => {
    mockGrupoFindById({
      _id: GRUPO_ID,
      desafio: {
        _id: DESAFIO_ID,
        status: "ativo",
        type: "grupo",
        maxParticipantes: 2,
        deliveryDate: "2099-01-01T00:00:00.000Z",
      },
      turma: { _id: TURMA_ID, status: "ativa" },
      participantes: [
        { _id: STUDENT_ID, name: "Aluno", role: "aluno", status: "ativo" },
        { _id: PARTICIPANT_ID, name: "Colega", role: "aluno", status: "ativo" },
      ],
      maxParticipantes: 2,
      status: "completo",
    });
    EnvioDesafio.create.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      description: "Entrega do grupo",
      type: "grupo",
      evidencias: ["https://evidencia.com"],
      anexos: [{ name: "print.png" }],
      participantes: [PARTICIPANT_ID],
      grupo: GRUPO_ID,
      status: "pendente",
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
      grupoId: GRUPO_ID,
      description: "Entrega do grupo",
      evidencias: ["https://evidencia.com"],
      anexos: [{ name: "print.png" }],
    });

    expect(EnvioDesafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        desafio: DESAFIO_ID,
        turma: TURMA_ID,
        aluno: STUDENT_ID,
        type: "grupo",
        participantes: [PARTICIPANT_ID],
        grupo: GRUPO_ID,
        anexos: [{ name: "print.png" }],
      })
    );
    expect(ParticipanteEnvio.create).toHaveBeenCalledWith([{ envio: "6814f12ab3f34872f7558f45", aluno: PARTICIPANT_ID, status: "ativo" }]);
    expect(result).toMatchObject({
      grupoId: GRUPO_ID,
      participantes: [PARTICIPANT_ID],
      status: "pendente",
      totalParticipantes: 2,
    });
  });

  it("mantém no histórico envios de grupos do aluno mesmo com desafio inativo", async () => {
    const query = {
      populate: jest.fn(() => query),
      sort: jest.fn(() => query),
      skip: jest.fn(() => query),
      limit: jest.fn(() => query),
      lean: jest.fn().mockResolvedValue([
        {
          _id: "6814f12ab3f34872f7558f45",
          desafio: { _id: DESAFIO_ID, title: "Desafio encerrado", status: "inativo" },
          aluno: { _id: STUDENT_ID, name: "Aluno" },
          participantes: [{ _id: PARTICIPANT_ID, name: "Colega" }],
          turma: { _id: TURMA_ID, name: "Turma 1" },
          description: "Entrega do grupo",
          type: "grupo",
          status: "pendente",
        },
      ]),
    };
    EnvioDesafio.countDocuments.mockResolvedValue(1);
    EnvioDesafio.find.mockReturnValue(query);

    const result = await listMine(PARTICIPANT_ID, { limit: "100" });

    expect(EnvioDesafio.find).toHaveBeenCalledWith({
      $or: [{ aluno: PARTICIPANT_ID }, { participantes: PARTICIPANT_ID }],
    });
    expect(result.envios).toHaveLength(1);
    expect(result.envios[0]).toMatchObject({
      desafio: { title: "Desafio encerrado", status: "inativo" },
      status: "pendente",
    });
  });

  it("rejeita grupo com mais de 5 participantes", async () => {
    const participantes = [
      PARTICIPANT_ID,
      SECOND_PARTICIPANT_ID,
      "6814f12ab3f34872f7558f46",
      "6814f12ab3f34872f7558f47",
      "6814f12ab3f34872f7558f48",
      "6814f12ab3f34872f7558f49",
    ];

    await expect(
      createEnvioDesafio(STUDENT_ID, {
        desafioId: DESAFIO_ID,
        turmaId: TURMA_ID,
        type: "grupo",
        description: "Grupo grande",
        evidencias: ["https://evidencia.com"],
        participantes,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Grupo pode ter no máximo 5 participantes.",
    });

    expect(EnvioDesafio.create).not.toHaveBeenCalled();
  });

  it("permite integrante do grupo editar envio pendente sem obrigar evidência ou anexo", async () => {
    const save = jest.fn().mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      participantes: [PARTICIPANT_ID],
      description: "Descrição atualizada",
      evidencias: [],
      anexos: [],
      status: "pendente",
    });
    EnvioDesafio.findById.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      participantes: [PARTICIPANT_ID],
      description: "Descrição anterior",
      evidencias: ["https://evidencia.com"],
      anexos: [{ name: "print.png" }],
      status: "pendente",
      save,
    });

    const result = await updateEnvio(PARTICIPANT_ID, "6814f12ab3f34872f7558f45", {
      description: "Descrição atualizada",
      evidencias: [],
      anexos: [],
    });

    expect(save).toHaveBeenCalled();
    expect(result).toMatchObject({
      description: "Descrição atualizada",
      evidencias: [],
      anexos: [],
      status: "pendente",
      totalParticipantes: 2,
    });
  });

  it("bloqueia edição do envio após aprovação", async () => {
    EnvioDesafio.findById.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      aluno: STUDENT_ID,
      participantes: [PARTICIPANT_ID],
      status: "aprovado",
    });

    await expect(
      updateEnvio(PARTICIPANT_ID, "6814f12ab3f34872f7558f45", {
        description: "Tentativa de ajuste",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Somente envios pendentes ou em ajuste podem ser alterados.",
    });
  });

  it("bloqueia edição de envio pendente quando o desafio está inativo", async () => {
    EnvioDesafio.findById.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      aluno: STUDENT_ID,
      participantes: [PARTICIPANT_ID],
      status: "pendente",
    });
    Desafio.findById.mockResolvedValue({ _id: DESAFIO_ID, status: "inativo" });

    await expect(
      updateEnvio(PARTICIPANT_ID, "6814f12ab3f34872f7558f45", {
        description: "Tentativa de edição tardia",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INACTIVE_CHALLENGE_EDIT_BLOCKED",
    });
  });
});
