const AlunoTurma = require("../../src/models/aluno-turma.model");
const AuthAttempt = require("../../src/models/auth-attempt.model");
const Desafio = require("../../src/models/desafio.model");
const EnvioDesafio = require("../../src/models/envio-desafio.model");
const Heuristic = require("../../src/models/heuristic.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Pilar = require("../../src/models/pilar.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");

describe("coleções relacionais", () => {
  it("usa os nomes de coleção exigidos pela modelagem MongoDB", () => {
    expect(User.collection.name).toBe("users");
    expect(AuthAttempt.collection.name).toBe("auth_attempts");
    expect(Heuristic.collection.name).toBe("heuristicas");
    expect(Turma.collection.name).toBe("turmas");
    expect(AlunoTurma.collection.name).toBe("alunos_turmas");
    expect(Pilar.collection.name).toBe("pilares");
    expect(Desafio.collection.name).toBe("desafios");
    expect(EnvioDesafio.collection.name).toBe("envios_desafios");
    expect(ParticipanteEnvio.collection.name).toBe("participantes_envio");
    expect(Pontuacao.collection.name).toBe("pontuacoes");
  });
});
