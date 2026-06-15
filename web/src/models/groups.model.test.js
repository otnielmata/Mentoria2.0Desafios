import { describe, expect, it } from "vitest";
import { toGroupDto, toGroupsDto } from "@/models/groups.model";

describe("models/groups", () => {
  it("normaliza grupo com envio, lider, participantes e status", () => {
    expect(
      toGroupDto({
        alunoResponsavel: { name: "Maria Silva" },
        envio_desafio_id: "envio-1",
        participantes: [{ name: "Joao" }, { nome: "Ana" }],
        pontos: "30",
        status: "aprovado",
        titulo: "Publicar artigo",
        turmaNome: "Turma A",
      })
    ).toMatchObject({
      challengeTitle: "Publicar artigo",
      className: "Turma A",
      leaderName: "Maria Silva",
      participants: [{ name: "Joao" }, { name: "Ana" }],
      pointsLabel: "30 pontos",
      points: 30,
      rankingLabel: "Pontuacao considerada no ranking",
      status: "aprovado",
      statusLabel: "Aprovado",
      submissionId: "envio-1",
    });
  });

  it("limita a exibicao a ate 5 participantes", () => {
    const group = toGroupDto({
      participantes: ["a", "b", "c", "d", "e", "f"],
    });

    expect(group.participants).toHaveLength(5);
    expect(group.participantsCount).toBe(6);
  });

  it("nao expoe email como nome de participante ou lider", () => {
    const group = toGroupDto({
      lider: "lider@email.com",
      participantes: ["aluno@email.com"],
    });

    expect(group.leaderName).toBe("Responsavel");
    expect(group.participants[0].name).toBe("Participante 1");
    expect(JSON.stringify(group)).not.toContain("@");
  });

  it("aceita payloads em formato de lista de grupos", () => {
    expect(
      toGroupsDto({
        grupos: [{ id: "grupo-1", participantes: [{ nome: "Aluno" }] }],
      })
    ).toHaveLength(1);
  });

  it("normaliza pilar e nao mostra pontos concedidos antes da aprovacao", () => {
    const group = toGroupDto({
      desafio: { pilar: { name: "Compartilhamento" }, title: "Publicar artigo" },
      participantes: [{ nome: "Aluno" }],
      pontos: 30,
      status: "ajuste",
    });

    expect(group.pillarName).toBe("Compartilhamento");
    expect(group.points).toBe(30);
    expect(group.pointsLabel).toBe("Sem pontos concedidos");
    expect(group.rankingConsidered).toBe(false);
    expect(group.rankingLabel).toBe("Pontuacao ainda nao considerada no ranking");
  });
});
