jest.mock("../../src/config/env", () => ({
  baseUrl: "https://mentoria2-0-desafios.vercel.app",
  mongoDbName: "mentoria_api",
  mongoEnvName: "MONGODB_URI",
  nodeEnv: "production",
}));

jest.mock("../../src/config/database", () => ({
  getDatabaseStatus: jest.fn(),
}));

const { getDatabaseStatus } = require("../../src/config/database");
const { healthCheck } = require("../../src/controllers/health.controller");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("health.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 200 quando o banco está conectado", () => {
    getDatabaseStatus.mockReturnValue({
      name: "mentoria_api",
      host: "cluster.mongodb.net",
      readyState: 1,
      status: "connected",
    });
    const res = createResponse();

    healthCheck({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        message: "API running",
        database: expect.objectContaining({ readyState: 1, status: "connected" }),
      })
    );
  });

  it("retorna 503 quando o banco está desconectado", () => {
    getDatabaseStatus.mockReturnValue({
      name: "mentoria_api",
      host: "cluster.mongodb.net",
      readyState: 0,
      status: "disconnected",
    });
    const res = createResponse();

    healthCheck({}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        message: "API running without database connection",
        database: expect.objectContaining({ readyState: 0, status: "disconnected" }),
      })
    );
  });
});
