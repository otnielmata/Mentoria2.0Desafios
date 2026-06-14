import { describe, expect, it } from "vitest";
import {
  initialUserForm,
  toUserDto,
  toUserRequestDto,
  toUsersDto,
  validateUserPayload,
} from "@/models/users.model";

describe("models/users", () => {
  it("normaliza payload de cadastro de aluno para a API", () => {
    expect(
      toUserRequestDto({
        email: " ALUNO@EMAIL.COM ",
        name: " Maria Silva ",
        role: "aluno",
        status: "ATIVO",
      })
    ).toEqual({
      email: "aluno@email.com",
      name: "Maria Silva",
      role: "aluno",
      status: "ativo",
    });
  });

  it("normaliza usuarios retornados pela API sem expor senha", () => {
    const user = toUserDto({
      _id: "user-1",
      email: "aluno@email.com",
      name: "Aluno Seguro",
      password: "segredo",
      role: "aluno",
      status: "ativo",
      turmas: [{ nome: "Turma A" }],
    });

    expect(user).toEqual({
      email: "aluno@email.com",
      id: "user-1",
      name: "Aluno Seguro",
      role: "aluno",
      roleLabel: "Aluno",
      status: "ativo",
      statusLabel: "Ativo",
      turma: "Turma A",
    });
    expect(JSON.stringify(user)).not.toContain("segredo");
  });

  it("aceita listas em aliases comuns da API", () => {
    expect(
      toUsersDto({
        usuarios: [
          {
            email: "professor@email.com",
            nome: "Professor",
            perfil: "professor",
            situacao: "pendente",
          },
        ],
      })
    ).toMatchObject([
      {
        email: "professor@email.com",
        name: "Professor",
        roleLabel: "Professor",
        statusLabel: "Pendente",
      },
    ]);
  });

  it("valida nome e e-mail antes de chamar a API", () => {
    const result = validateUserPayload({
      ...initialUserForm,
      email: "email-invalido",
      name: "",
    });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        email: "Informe um e-mail valido.",
        name: "Informe o nome do aluno.",
      },
      message: "Revise os dados do aluno.",
    });
  });
});
