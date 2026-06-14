import { describe, expect, it } from "vitest";
import { normalizeProfileRole, toProfileDto } from "@/models/profile.model";

describe("models/profile", () => {
  it("normaliza dados cadastrais do usuario autenticado", () => {
    expect(
      toProfileDto({
        user: {
          _id: "user-1",
          email: "aluno@email.com",
          name: "Joao Souza",
          role: "aluno",
          status: "ativo",
          turmas: [{ name: "Turma A" }, "Turma B"],
        },
      })
    ).toEqual({
      email: "aluno@email.com",
      id: "user-1",
      name: "Joao Souza",
      role: "aluno",
      roleLabel: "Aluno",
      status: "ativo",
      turmas: ["Turma A", "Turma B"],
    });
  });

  it("aceita aliases em portugues e envelopes alternativos", () => {
    expect(
      toProfileDto({
        data: {
          e_mail: "professor@email.com",
          nome: "Professor Mentor",
          perfil: "professor",
          situacao: "ativo",
          usuarioId: "user-2",
        },
      })
    ).toMatchObject({
      email: "professor@email.com",
      id: "user-2",
      name: "Professor Mentor",
      role: "professor",
      roleLabel: "Professor",
      status: "ativo",
    });
  });

  it("oculta dados sensiveis retornados pela API", () => {
    const profile = toProfileDto({
      user: {
        email: "admin@email.com",
        name: "Admin",
        password: "senha",
        privateKey: "segredo",
        role: "admin",
        status: "ativo",
        token: "jwt",
      },
    });

    expect(profile).toEqual({
      email: "admin@email.com",
      id: "",
      name: "Admin",
      role: "admin",
      roleLabel: "Admin",
      status: "ativo",
      turmas: [],
    });
    expect(JSON.stringify(profile)).not.toContain("senha");
    expect(JSON.stringify(profile)).not.toContain("jwt");
    expect(JSON.stringify(profile)).not.toContain("segredo");
  });

  it("normaliza perfil desconhecido como aluno para manter navegacao segura", () => {
    expect(normalizeProfileRole("desconhecido")).toBe("aluno");
  });
});
