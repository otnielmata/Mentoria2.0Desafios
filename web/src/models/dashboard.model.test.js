import { describe, expect, it } from "vitest";
import {
  toPillarScoreDto,
  toStudentDashboardDto,
  toSubmissionSummaryDto,
} from "@/models/dashboard.model";

describe("models/dashboard", () => {
  it("normaliza indicadores do dashboard do aluno retornados pela API", () => {
    expect(
      toStudentDashboardDto({
        desafios_aprovados: "18",
        desafios_pendentes: 3,
        pontos_totais: "320",
        posicao_ranking: "4",
        pontuacao_por_pilar: [{ nome: "Compartilhamento", pontos: "90" }],
        ultimos_desafios: [{ desafio: "Publicar artigo", pilar: "Compartilhamento", status: "aprovado" }],
      })
    ).toEqual({
      approvedChallenges: 18,
      pendingChallenges: 3,
      pointsByPillar: [{ id: "Compartilhamento", name: "Compartilhamento", points: 90 }],
      rankingPosition: 4,
      recentSubmissions: [
        {
          challengeTitle: "Publicar artigo",
          id: "",
          pillarName: "Compartilhamento",
          status: "aprovado",
        },
      ],
      totalPoints: 320,
    });
  });

  it("aceita aliases em camelCase sem calcular ranking no front-end", () => {
    expect(
      toStudentDashboardDto({
        approvedChallenges: 2,
        pendingChallenges: 1,
        pointsByPillar: [{ name: "Pratica", points: 20 }],
        rankingPosition: 7,
        totalPoints: 45,
      })
    ).toMatchObject({
      approvedChallenges: 2,
      pendingChallenges: 1,
      pointsByPillar: [{ id: "Pratica", name: "Pratica", points: 20 }],
      rankingPosition: 7,
      totalPoints: 45,
    });
  });

  it("mantem DTOs seguros quando campos opcionais nao vierem da API", () => {
    expect(toPillarScoreDto()).toEqual({ id: "", name: "Pilar", points: 0 });
    expect(toSubmissionSummaryDto()).toEqual({
      challengeTitle: "Desafio",
      id: "",
      pillarName: "Pilar",
      status: "pendente",
    });
    expect(toStudentDashboardDto()).toMatchObject({
      approvedChallenges: 0,
      pendingChallenges: 0,
      pointsByPillar: [],
      rankingPosition: null,
      recentSubmissions: [],
      totalPoints: 0,
    });
  });
});
