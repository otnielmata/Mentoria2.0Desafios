import { describe, expect, it } from "vitest";
import {
  approvalActions,
  toApprovalReviewRequestDto,
  toChallengeApprovalDto,
  toChallengeApprovalsDto,
  validateApprovalReviewPayload,
} from "@/models/challenge-approvals.model";

describe("models/challenge-approvals", () => {
  it("normaliza envios pendentes com aluno, desafio, descricao e evidencias", () => {
    expect(
      toChallengeApprovalDto({
        alunoResponsavel: { name: "Maria Silva" },
        created_at: "2026-06-14T10:00:00.000Z",
        descricao: "Publicou artigo tecnico.",
        desafio: { pilar: { nome: "Compartilhamento" }, titulo: "Publicar artigo" },
        evidencia_url: "https://example.com/artigo",
        id: "envio-1",
        pontos: "30",
        status: "pendente",
        tipo: "grupo",
      })
    ).toMatchObject({
      challengeTitle: "Publicar artigo",
      description: "Publicou artigo tecnico.",
      evidences: ["https://example.com/artigo"],
      id: "envio-1",
      pillarName: "Compartilhamento",
      points: 30,
      status: "pendente",
      statusLabel: "Pendente",
      studentName: "Maria Silva",
      type: "grupo",
    });
  });

  it("mantem na fila somente envios pendentes", () => {
    const approvals = toChallengeApprovalsDto({
      envios: [
        { id: "envio-1", status: "pendente", titulo: "Aguardando" },
        { id: "envio-2", status: "aprovado", titulo: "Concluido" },
      ],
    });

    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({ id: "envio-1", status: "pendente" });
  });

  it("monta payload de avaliacao para o endpoint de aprovacoes", () => {
    expect(
      toApprovalReviewRequestDto({
        action: approvalActions.approve,
        feedback: "Boa entrega.",
        submissionId: "envio-1",
      })
    ).toEqual({
      envio_desafio_id: "envio-1",
      feedback_admin: "Boa entrega.",
      status: "aprovado",
    });
  });

  it("exige feedback suficiente ao solicitar ajuste", () => {
    expect(
      validateApprovalReviewPayload({
        action: approvalActions.adjustment,
        feedback: "Curto",
        submissionId: "envio-1",
      })
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        feedback: "Informe um feedback com pelo menos 10 caracteres para solicitar ajuste.",
      },
    });
  });

  it("aceita aprovacao sem feedback porque a API atribui pontos", () => {
    expect(
      validateApprovalReviewPayload({
        action: approvalActions.approve,
        feedback: "",
        submissionId: "envio-1",
      })
    ).toMatchObject({
      ok: true,
      data: {
        envio_desafio_id: "envio-1",
        status: "aprovado",
      },
    });
  });
});
