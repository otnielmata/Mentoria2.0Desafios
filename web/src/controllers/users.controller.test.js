import { describe, expect, it, vi } from "vitest";
import { createUser, getUsers } from "@/controllers/users.controller";

describe("controllers/users", () => {
  it("normaliza listagem de alunos para a view", async () => {
    const requestUsers = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        users: [{ email: "aluno@email.com", name: "Aluno", role: "aluno", status: "ativo" }],
      },
    });

    await expect(getUsers({ requestUsers })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          email: "aluno@email.com",
          name: "Aluno",
          roleLabel: "Aluno",
          statusLabel: "Ativo",
        },
      ],
    });
    expect(requestUsers).toHaveBeenCalledTimes(1);
  });

  it("impede cadastro com campos obrigatorios invalidos", async () => {
    const requestCreateUser = vi.fn();

    await expect(
      createUser(
        { email: "email-invalido", name: "", role: "aluno", status: "ativo" },
        { requestCreateUser }
      )
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: {
        email: "Informe um e-mail valido.",
        name: "Informe o nome do aluno.",
      },
    });
    expect(requestCreateUser).not.toHaveBeenCalled();
  });

  it("envia cadastro valido para API e retorna confirmacao amigavel", async () => {
    const requestCreateUser = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        email: "aluno@email.com",
        name: "Aluno",
        role: "aluno",
        status: "ativo",
      },
    });

    await expect(
      createUser(
        { email: "ALUNO@EMAIL.COM", name: "Aluno", role: "aluno", status: "ativo" },
        { requestCreateUser }
      )
    ).resolves.toMatchObject({
      ok: true,
      data: {
        email: "aluno@email.com",
        roleLabel: "Aluno",
      },
      message: "Aluno cadastrado com sucesso.",
    });
    expect(requestCreateUser).toHaveBeenCalledWith({
      email: "aluno@email.com",
      name: "Aluno",
      role: "aluno",
      status: "ativo",
    });
  });
});
