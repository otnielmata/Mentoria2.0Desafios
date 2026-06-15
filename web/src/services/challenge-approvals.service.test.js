import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import {
  listChallengeApprovalsRequest,
  reviewChallengeApprovalRequest,
} from "@/services/challenge-approvals.service";

describe("services/challenge-approvals", () => {
  it("consulta a fila de aprovacoes no endpoint unico da funcionalidade", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listChallengeApprovalsRequest(requester);

    expect(apiEndpoints.challengeSubmissions.approvals).toBe("/api/envios-desafios/aprovacoes");
    expect(requester).toHaveBeenCalledWith("/api/envios-desafios/aprovacoes");
  });

  it("envia avaliacao por PATCH para o mesmo endpoint de aprovacoes", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: { status: "aprovado" } });
    const payload = {
      envio_desafio_id: "envio-1",
      feedback_admin: "",
      status: "aprovado",
    };

    await reviewChallengeApprovalRequest(payload, requester);

    expect(requester).toHaveBeenCalledWith("/api/envios-desafios/aprovacoes", {
      method: "PATCH",
      payload,
    });
  });
});
