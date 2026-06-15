import { describe, expect, it, vi } from "vitest";
import {
  getChallengeApprovals,
  reviewChallengeApproval,
} from "@/controllers/challenge-approvals.controller";
import { approvalActions } from "@/models/challenge-approvals.model";

describe("controllers/challenge-approvals", () => {
  it("normaliza a listagem de envios pendentes para a view", async () => {
    const requestApprovals = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        envios: [
          {
            alunoNome: "Joao Souza",
            descricao: "Ajudou colega no Discord.",
            evidencia_url: "https://example.com/print",
            pontos: 15,
            status: "pendente",
            titulo: "Ajudar colega",
          },
        ],
      },
    });

    await expect(getChallengeApprovals({ requestApprovals })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          challengeTitle: "Ajudar colega",
          description: "Ajudou colega no Discord.",
          evidences: ["https://example.com/print"],
          points: 15,
          studentName: "Joao Souza",
        },
      ],
    });
    expect(requestApprovals).toHaveBeenCalledTimes(1);
  });

  it("impede solicitacao de ajuste sem feedback suficiente", async () => {
    const requestReviewApproval = vi.fn();

    await expect(
      reviewChallengeApproval(
        {
          action: approvalActions.adjustment,
          feedback: "Curto",
          submissionId: "envio-1",
        },
        { requestReviewApproval }
      )
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: {
        feedback: "Informe um feedback com pelo menos 10 caracteres para solicitar ajuste.",
      },
    });
    expect(requestReviewApproval).not.toHaveBeenCalled();
  });

  it("aprova envio e retorna mensagem indicando pontuacao pela API", async () => {
    const requestReviewApproval = vi.fn().mockResolvedValue({
      ok: true,
      data: { id: "envio-1", status: "aprovado" },
    });

    await expect(
      reviewChallengeApproval(
        {
          action: approvalActions.approve,
          feedback: "",
          submissionId: "envio-1",
        },
        { requestReviewApproval }
      )
    ).resolves.toMatchObject({
      ok: true,
      message: "Envio aprovado com sucesso. A API atribuira os pontos automaticamente.",
    });
    expect(requestReviewApproval).toHaveBeenCalledWith({
      envio_desafio_id: "envio-1",
      feedback_admin: "",
      status: "aprovado",
    });
  });

  it("mapeia erros de feedback retornados pela API", async () => {
    const requestReviewApproval = vi.fn().mockResolvedValue({
      ok: false,
      details: [{ field: "feedback_admin", message: "Feedback obrigatorio." }],
      message: "Dados invalidos.",
    });

    await expect(
      reviewChallengeApproval(
        {
          action: approvalActions.reject,
          feedback: "",
          submissionId: "envio-1",
        },
        { requestReviewApproval }
      )
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: {
        feedback: "Feedback obrigatorio.",
      },
    });
  });
});
