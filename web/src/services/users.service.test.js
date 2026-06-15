import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { createUserRequest, listUsersRequest } from "@/services/users.service";

describe("services/users", () => {
  it("lista alunos usando o endpoint unico de usuarios", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listUsersRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.users.collection);
    expect(apiEndpoints.users.collection).toBe("/api/users");
  });

  it("cadastra aluno usando POST no mesmo endpoint de usuarios", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const payload = {
      email: "aluno@email.com",
      name: "Aluno",
      role: "aluno",
      status: "ativo",
    };

    await createUserRequest(payload, requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.users.collection, {
      method: "POST",
      payload,
    });
  });
});
