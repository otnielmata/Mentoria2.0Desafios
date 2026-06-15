import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { getMyChallengeSubmissionsRequest } from "@/services/my-challenge-submissions.service";

describe("services/my-challenge-submissions", () => {
  it("consulta apenas o endpoint de meus envios de desafios", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await getMyChallengeSubmissionsRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.challengeSubmissions.mine);
    expect(apiEndpoints.challengeSubmissions.mine).toBe("/api/envios-desafios/meus");
  });
});
