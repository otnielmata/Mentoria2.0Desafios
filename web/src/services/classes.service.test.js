import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { createClassRequest, listClassesRequest } from "@/services/classes.service";

describe("services/classes", () => {
  it("lista turmas usando o endpoint unico de turmas", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listClassesRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.classes.collection);
    expect(apiEndpoints.classes.collection).toBe("/api/turmas");
  });

  it("cadastra turma usando POST no mesmo endpoint de turmas", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const payload = {
      data_fim: "2026-08-30",
      data_inicio: "2026-08-01",
      nome: "Turma Agosto",
      status: "ativa",
    };

    await createClassRequest(payload, requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.classes.collection, {
      method: "POST",
      payload,
    });
  });
});
