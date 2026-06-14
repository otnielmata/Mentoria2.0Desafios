import { describe, expect, it } from "vitest";
import {
  hasAdminDashboardData,
  toAdminDashboardDto,
  toAdminEngagementDto,
  toAdminHighlightStudentDto,
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

  it("normaliza indicadores do dashboard admin sem recalcular dados no front-end", () => {
    expect(
      toAdminDashboardDto({
        engajamento: {
          alunosComEnvio: 8,
          mediaEnviosPorAluno: 1.5,
          taxaAprovacao: 0.75,
          taxaParticipacao: 0.8,
        },
        indicadores: {
          alunosAtivos: "10",
          aprovacoesPendentes: 3,
          totalEnvios: "25",
        },
        topRanking: [
          {
            aluno: { email: "maria@email.com", id: "aluno-1", name: "Maria Silva" },
            desafiosAprovados: 7,
            totalPontos: 540,
          },
        ],
      })
    ).toEqual({
      activeStudents: 10,
      engagement: {
        approvalRate: 0.75,
        averageSubmissionsPerStudent: 1.5,
        participationRate: 0.8,
        studentsWithSubmissions: 8,
      },
      lowParticipationStudents: [],
      pendingApprovals: 3,
      topEngagedStudents: [
        {
          approvedChallenges: 7,
          id: "aluno-1",
          name: "Maria Silva",
          points: 540,
          submissions: 0,
        },
      ],
      totalSubmissions: 25,
    });
  });

  it("normaliza destaques do admin sem expor e-mail em cards resumidos", () => {
    const highlight = toAdminHighlightStudentDto({
      aluno: { email: "aluno@email.com", name: "Aluno Seguro" },
      envios: 2,
      pontos: 20,
    });

    expect(highlight).toEqual({
      approvedChallenges: 0,
      id: "",
      name: "Aluno Seguro",
      points: 20,
      submissions: 2,
    });
    expect(JSON.stringify(highlight)).not.toContain("aluno@email.com");
  });

  it("mantem DTOs admin seguros quando campos opcionais nao vierem da API", () => {
    expect(toAdminEngagementDto()).toEqual({
      approvalRate: 0,
      averageSubmissionsPerStudent: 0,
      participationRate: 0,
      studentsWithSubmissions: 0,
    });
    expect(hasAdminDashboardData(toAdminDashboardDto())).toBe(false);
    expect(hasAdminDashboardData({ activeStudents: 1 })).toBe(true);
  });
});
