import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { submitChallengeSubmissionRequest } from "@/services/challenge-submission.service";

describe("services/challenge-submission", () => {
  it("envia somente POST para o endpoint de envios de desafios", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: { status: "pendente" } });
    const payload = { desafioId: "desafio-1" };

    await submitChallengeSubmissionRequest(payload, requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.challengeSubmissions.create, {
      method: "POST",
      payload,
    });
    expect(apiEndpoints.challengeSubmissions.create).toBe("/api/envios-desafios");
  });
});
