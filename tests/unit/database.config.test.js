describe("database.config", () => {
  function loadDatabaseModule() {
    jest.resetModules();
    jest.doMock("../../src/config/env", () => ({
      mongoDbName: "mentoria_api",
      mongoUri: "mongodb://example.test/mentoria_api",
    }));
    jest.doMock("../../src/seeds/pilares.seed", () => ({
      seedDefaultPilares: jest.fn(),
    }));
    jest.doMock("mongoose", () => ({
      connection: {
        readyState: 0,
        name: null,
        host: null,
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }));

    const mongoose = require("mongoose");
    const { seedDefaultPilares } = require("../../src/seeds/pilares.seed");
    const databaseModule = require("../../src/config/database");
    return { mongoose, seedDefaultPilares, ...databaseModule };
  }

  it("reutiliza a conexão já aberta sem reconnectar", async () => {
    const { mongoose, seedDefaultPilares, connectDatabase } = loadDatabaseModule();
    mongoose.connection.readyState = 1;

    const result = await connectDatabase();

    expect(mongoose.connect).not.toHaveBeenCalled();
    expect(seedDefaultPilares).not.toHaveBeenCalled();
    expect(result).toBe(mongoose.connection);
  });

  it("abre conexão, aplica seed e retorna a conexão", async () => {
    const { mongoose, seedDefaultPilares, connectDatabase } = loadDatabaseModule();
    mongoose.connect.mockImplementation(async () => {
      mongoose.connection.readyState = 1;
      mongoose.connection.name = "mentoria_api";
      mongoose.connection.host = "cluster.mongodb.net";
      return mongoose;
    });

    const result = await connectDatabase();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://example.test/mentoria_api", { dbName: "mentoria_api" });
    expect(seedDefaultPilares).toHaveBeenCalledTimes(1);
    expect(result).toBe(mongoose.connection);
  });

  it("força reconexão quando a conexão estava desconectando", async () => {
    const { mongoose, connectDatabase } = loadDatabaseModule();
    mongoose.connection.readyState = 3;
    mongoose.disconnect.mockResolvedValue(undefined);
    mongoose.connect.mockImplementation(async () => {
      mongoose.connection.readyState = 1;
      return mongoose;
    });

    await connectDatabase();

    expect(mongoose.disconnect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("informa status degradado quando o banco não está conectado", () => {
    const { mongoose, getDatabaseStatus } = loadDatabaseModule();
    mongoose.connection.readyState = 0;

    expect(getDatabaseStatus()).toEqual({
      name: null,
      host: null,
      readyState: 0,
      status: "disconnected",
    });
  });
});
