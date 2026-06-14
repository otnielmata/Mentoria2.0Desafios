import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { getStudentDashboardRequest } from "@/services/dashboard.service";

describe("services/dashboard", () => {
  it("consulta apenas o endpoint do dashboard do aluno", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: {} });

    await getStudentDashboardRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.dashboard.student);
    expect(apiEndpoints.dashboard.student).toBe("/api/dashboard/aluno");
  });
});
