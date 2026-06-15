import { describe, expect, it, vi } from "vitest";
import { getProfile } from "@/controllers/profile.controller";

describe("controllers/profile", () => {
  it("normaliza perfil quando a API responde com sucesso", async () => {
    const requestProfile = vi.fn(async () => ({
      data: {
        user: {
          email: "aluno@email.com",
          name: "Aluno",
          role: "aluno",
          status: "ativo",
        },
      },
      ok: true,
      status: 200,
    }));

    const result = await getProfile({ requestProfile });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      email: "aluno@email.com",
      name: "Aluno",
      roleLabel: "Aluno",
      status: "ativo",
    });
  });

  it("preserva erro de sessao invalida para o guard redirecionar ao login", async () => {
    const apiError = { message: "Sessao expirada", ok: false, type: "unauthorized" };
    const requestProfile = vi.fn(async () => apiError);

    await expect(getProfile({ requestProfile })).resolves.toBe(apiError);
  });
});
