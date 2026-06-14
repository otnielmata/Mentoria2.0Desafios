import { describe, expect, it } from "vitest";
import {
  hasApprovedScore,
  methodPillarNames,
  toMyScoreDto,
  toPillarScoreItemDto,
  toScoreHistoryItemDto,
} from "@/models/my-score.model";

describe("models/my-score", () => {
  it("normaliza minha pontuacao retornada pela API sem recalcular total no front-end", () => {
    const score = toMyScoreDto({
      desafiosAprovados: "18",
      historico: [
        {
          createdAt: "2026-06-01T10:00:00.000Z",
          desafio: {
            pilar: { name: "Compartilhamento" },
            title: "Publicar artigo",
          },
          envioId: "envio-1",
          id: "pontuacao-1",
          pontos: 30,
        },
      ],
      pontosPorPilar: [
        {
          desafiosAprovados: 5,
          pilar: { id: "pilar-5", name: "Compartilhamento" },
          pontos: "90",
        },
      ],
      totalPontos: "320",
    });

    expect(score.totalPoints).toBe(320);
    expect(score.approvedChallenges).toBe(18);
    expect(score.pointsByPillar).toHaveLength(methodPillarNames.length);
    expect(score.pointsByPillar.find((item) => item.name === "Compartilhamento")).toEqual({
      approvedChallenges: 5,
      id: "pilar-5",
      name: "Compartilhamento",
      points: 90,
    });
    expect(score.history).toEqual([
      {
        approvedAt: "",
        challengeTitle: "Publicar artigo",
        createdAt: "2026-06-01T10:00:00.000Z",
        id: "pontuacao-1",
        pillarName: "Compartilhamento",
        points: 30,
        reason: "Publicar artigo",
        submissionId: "envio-1",
      },
    ]);
  });

  it("mantem o total vindo da API mesmo quando o historico tem outro valor", () => {
    const score = toMyScoreDto({
      historico: [{ pontos: 50 }],
      totalPontos: 10,
    });

    expect(score.totalPoints).toBe(10);
  });

  it("aceita aliases em ingles e envelopes de data", () => {
    const score = toMyScoreDto({
      data: {
        approvedChallenges: 1,
        history: [{ points: 20, reason: "Ajuda no Discord", submission: { id: "envio-2" } }],
        pointsByPillar: [{ name: "Exposicao a Problemas", points: 20 }],
        totalPoints: 20,
      },
    });

    expect(score.totalPoints).toBe(20);
    expect(score.approvedChallenges).toBe(1);
    expect(score.history[0]).toMatchObject({
      points: 20,
      reason: "Ajuda no Discord",
      submissionId: "envio-2",
    });
    expect(score.pointsByPillar.find((item) => item.name === "Exposicao a Problemas").points).toBe(20);
  });

  it("mantem DTOs seguros quando campos opcionais nao vierem da API", () => {
    expect(toPillarScoreItemDto()).toEqual({
      approvedChallenges: 0,
      id: "Pilar",
      name: "Pilar",
      points: 0,
    });
    expect(toScoreHistoryItemDto()).toEqual({
      approvedAt: "",
      challengeTitle: "Desafio",
      createdAt: "",
      id: "",
      pillarName: "Pilar",
      points: 0,
      reason: "Desafio",
      submissionId: "",
    });
    expect(hasApprovedScore(toMyScoreDto())).toBe(false);
  });

  it("identifica pontuacao aprovada pelo total, historico ou pilar retornado pela API", () => {
    expect(hasApprovedScore({ totalPoints: 1 })).toBe(true);
    expect(hasApprovedScore({ approvedChallenges: 1 })).toBe(true);
    expect(hasApprovedScore({ history: [{}] })).toBe(true);
    expect(hasApprovedScore({ pointsByPillar: [{ points: 1 }] })).toBe(true);
  });
});
