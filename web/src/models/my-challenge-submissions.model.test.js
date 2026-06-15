import { describe, expect, it } from "vitest";
import {
  submissionStatusLabels,
  toMyChallengeSubmissionDto,
  toMyChallengeSubmissionsDto,
} from "@/models/my-challenge-submissions.model";

describe("models/my-challenge-submissions", () => {
  it("normaliza envios do aluno retornados pela API", () => {
    expect(
      toMyChallengeSubmissionDto({
        _id: "envio-1",
        createdAt: "2026-06-14T10:00:00.000Z",
        description: "Entrega do desafio",
        desafio: {
          title: "Publicar artigo",
          pilar: { name: "Compartilhamento" },
        },
        evidencias: ["https://exemplo.com"],
        feedback: "Revisar evidencia.",
        status: "ajuste",
        type: "grupo",
      })
    ).toEqual({
      challengeTitle: "Publicar artigo",
      createdAt: "2026-06-14T10:00:00.000Z",
      description: "Entrega do desafio",
      evidences: ["https://exemplo.com"],
      feedback: "Revisar evidencia.",
      id: "envio-1",
      pillarId: "",
      pillarName: "Compartilhamento",
      status: "ajuste",
      statusLabel: "Ajuste solicitado",
      turmaName: "",
      type: "grupo",
    });
  });

  it("aceita diferentes envelopes de lista", () => {
    const item = { id: "1", title: "Desafio", status: "aprovado" };

    expect(toMyChallengeSubmissionsDto([item])).toHaveLength(1);
    expect(toMyChallengeSubmissionsDto({ envios: [item] })).toHaveLength(1);
    expect(toMyChallengeSubmissionsDto({ items: [item] })).toHaveLength(1);
    expect(toMyChallengeSubmissionsDto({ data: [item] })).toHaveLength(1);
  });

  it("mantem labels claros para todos os status validos", () => {
    expect(submissionStatusLabels).toEqual({
      ajuste: "Ajuste solicitado",
      aprovado: "Aprovado",
      pendente: "Pendente",
      reprovado: "Reprovado",
    });
  });

  it("normaliza status desconhecido para pendente", () => {
    expect(toMyChallengeSubmissionDto({ status: "em_analise" })).toMatchObject({
      status: "pendente",
      statusLabel: "Pendente",
    });
  });
});
