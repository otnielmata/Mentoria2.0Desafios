import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { createChallengeRequest, listChallengesRequest } from "@/services/challenges.service";

describe("services/challenges", () => {
  it("lista desafios usando o endpoint unico de desafios", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listChallengesRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.challenges.collection);
    expect(apiEndpoints.challenges.collection).toBe("/api/desafios");
  });

  it("cadastra desafio usando POST no mesmo endpoint", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const payload = {
      descricao: "Descricao do desafio",
      max_participantes: 5,
      pilarId: "pilar-1",
      pontos: 20,
      status: "ativo",
      tipo: "grupo",
      titulo: "Desafio",
    };

    await createChallengeRequest(payload, requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.challenges.collection, {
      method: "POST",
      payload,
    });
  });
});
