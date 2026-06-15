const {
  getFunctionalConfigurations,
  hasSensitiveContent,
  isLeadershipBonusEnabled,
  sanitizeObject,
} = require("../../src/services/configuration.service");

describe("configuration.service MR-98", () => {
  const originalEnv = process.env.RANKING_HIDE_INACTIVE_STUDENTS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RANKING_HIDE_INACTIVE_STUDENTS;
    } else {
      process.env.RANKING_HIDE_INACTIVE_STUDENTS = originalEnv;
    }
  });

  it("retorna configurações funcionais somente leitura sem segredos técnicos", () => {
    const configurations = getFunctionalConfigurations();
    const serialized = JSON.stringify(configurations).toLowerCase();

    expect(configurations).toMatchObject({
      readOnly: true,
      editingEnabled: false,
      ranking: {
        generalVisibleToStudents: true,
      },
      pontuacao: {
        model: "pontuacao_fixa_por_desafio",
        leadershipBonus: {
          enabled: false,
          editable: false,
        },
        recurrence: {
          enabled: true,
          limitePorPeriodo: true,
          acaoAoExceder: "bloquear",
        },
      },
      evolucoes: {
        achievements: {
          enabled: false,
          status: "futuro",
        },
      },
    });
    expect(serialized).not.toContain("mongodb");
    expect(serialized).not.toContain("jwt");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("senha");
  });

  it("sanitiza campos sensíveis em qualquer nível", () => {
    const sanitized = sanitizeObject({
      publicValue: "ok",
      token: "abc",
      nested: {
        password: "123",
        safe: "valor",
        mongoUri: "mongodb+srv://user:pass@cluster",
      },
      list: [{ name: "item", secret: "hidden" }, "Bearer abc"],
    });

    expect(sanitized).toEqual({
      publicValue: "ok",
      nested: {
        safe: "valor",
      },
      list: [{ name: "item" }],
    });
  });

  it("expõe ranking por configuração sem vazar variável técnica", () => {
    process.env.RANKING_HIDE_INACTIVE_STUDENTS = "true";

    const configurations = getFunctionalConfigurations();

    expect(configurations.ranking.hideInactiveStudents).toBe(true);
    expect(JSON.stringify(configurations)).not.toContain("RANKING_HIDE_INACTIVE_STUDENTS");
  });

  it("mantém bônus de liderança desligado no MVP", () => {
    expect(isLeadershipBonusEnabled()).toBe(false);
  });

  it("identifica conteúdo sensível por chave ou valor", () => {
    expect(hasSensitiveContent("JWT_SECRET")).toBe(true);
    expect(hasSensitiveContent("mongodb://localhost:27017/app")).toBe(true);
    expect(hasSensitiveContent("ranking geral")).toBe(false);
  });
});
