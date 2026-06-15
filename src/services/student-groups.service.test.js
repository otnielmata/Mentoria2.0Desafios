const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildMyGroupsFilter,
  buildScoreMap,
  serializeStudentGroup,
} = require("./student-groups.service");

test("buildMyGroupsFilter restringe grupos ao aluno autenticado", () => {
  assert.deepEqual(buildMyGroupsFilter("aluno-1"), {
    $or: [{ aluno: "aluno-1" }, { participantes: "aluno-1" }],
    "participantes.0": { $exists: true },
    type: "grupo",
  });
});

test("serializeStudentGroup mostra pontos somente para grupo aprovado", () => {
  const approved = serializeStudentGroup(
    {
      aluno: { id: "aluno-1", name: "Maria", role: "aluno" },
      createdAt: "2026-01-01T00:00:00.000Z",
      desafio: {
        id: "desafio-1",
        pilar: { id: "pilar-1", name: "Networking" },
        points: 30,
        title: "Participar de encontro",
      },
      id: "envio-1",
      participantes: [{ id: "aluno-2", name: "Joao", role: "aluno" }],
      status: "aprovado",
      turma: { id: "turma-1", name: "Turma A" },
    },
    buildScoreMap([{ envio: "envio-1", pontos: 30 }])
  );

  assert.equal(approved.pontos, 30);
  assert.equal(approved.pontosConcedidos, 30);
  assert.equal(approved.pontuacaoConsideradaNoRanking, true);
  assert.equal(approved.pilarNome, "Networking");
  assert.equal(approved.participantes.length, 2);

  const pending = serializeStudentGroup({
    aluno: { id: "aluno-1", name: "Maria", role: "aluno" },
    desafio: { id: "desafio-1", points: 30, title: "Participar de encontro" },
    id: "envio-2",
    participantes: [{ id: "aluno-2", name: "Joao", role: "aluno" }],
    status: "pendente",
  });

  assert.equal(pending.pontos, 0);
  assert.equal(pending.pontosConcedidos, null);
  assert.equal(pending.pontuacaoConsideradaNoRanking, false);
});

test("serializeStudentGroup limita participantes exibidos a cinco alunos", () => {
  const group = serializeStudentGroup({
    aluno: { id: "aluno-1", name: "Aluno 1" },
    desafio: { id: "desafio-1", points: 10, title: "Desafio em grupo" },
    id: "envio-1",
    participantes: [
      { id: "aluno-2", name: "Aluno 2" },
      { id: "aluno-3", name: "Aluno 3" },
      { id: "aluno-4", name: "Aluno 4" },
      { id: "aluno-5", name: "Aluno 5" },
      { id: "aluno-6", name: "Aluno 6" },
    ],
    status: "aprovado",
  });

  assert.equal(group.participantes.length, 5);
  assert.equal(group.totalParticipantes, 6);
});
