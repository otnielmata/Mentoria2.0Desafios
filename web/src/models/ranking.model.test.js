import { describe, expect, it } from "vitest";
import {
  isCurrentRankingEntry,
  toRankingDto,
  toRankingEntryDto,
} from "@/models/ranking.model";

describe("models/ranking", () => {
  it("normaliza ranking geral sem recalcular posicoes no front-end", () => {
    const ranking = toRankingDto({
      ranking: [
        {
          aluno: { id: "aluno-1", name: "Maria Silva" },
          desafiosAprovados: 12,
          posicao: 2,
          totalPontos: 540,
        },
      ],
      totalParticipantes: 3,
    });

    expect(ranking.totalParticipants).toBe(3);
    expect(ranking.entries).toEqual([
      {
        approvedChallenges: 12,
        id: "aluno-1",
        isCurrentUser: false,
        position: 2,
        points: 540,
        studentEmail: "",
        studentName: "Maria Silva",
      },
    ]);
  });

  it("aceita aliases sem expor dados sensiveis na view", () => {
    expect(
      toRankingEntryDto({
        position: "4",
        points: "320",
        student: { _id: "aluno-4", email: "joao@email.com", nome: "Joao Souza" },
      })
    ).toEqual({
      approvedChallenges: 0,
      id: "aluno-4",
      isCurrentUser: false,
      position: 4,
      points: 320,
      studentEmail: "joao@email.com",
      studentName: "Joao Souza",
    });
  });

  it("identifica o usuario atual por id, email ou flag da API", () => {
    expect(isCurrentRankingEntry({ id: "aluno-1" }, { id: "aluno-1" })).toBe(true);
    expect(isCurrentRankingEntry({ studentEmail: "aluno@email.com" }, { email: "aluno@email.com" })).toBe(true);
    expect(isCurrentRankingEntry({ isCurrentUser: true }, {})).toBe(true);
    expect(isCurrentRankingEntry({ id: "outro" }, { id: "aluno-1" })).toBe(false);
  });

  it("normaliza indisponibilidade informada pela API", () => {
    const ranking = toRankingDto({
      mensagem: "Ranking desabilitado.",
      permitido: false,
      ranking: [],
    });

    expect(ranking.isAllowed).toBe(false);
    expect(ranking.unavailableMessage).toBe("Ranking desabilitado.");
  });
});
