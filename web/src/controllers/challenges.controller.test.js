import { describe, expect, it, vi } from "vitest";
import { createChallenge, getChallenges } from "@/controllers/challenges.controller";

describe("controllers/challenges", () => {
  it("normaliza listagem de desafios para a view", async () => {
    const requestChallenges = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        desafios: [
          {
            max_participantes: 5,
            pilarNome: "Pratica",
            pontos: 20,
            tipo: "grupo",
            titulo: "Desafio pratico",
          },
        ],
      },
    });

    await expect(getChallenges({ requestChallenges })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          maxParticipants: 5,
          pillarName: "Pratica",
          points: 20,
          title: "Desafio pratico",
          typeLabel: "Grupo",
        },
      ],
    });
    expect(requestChallenges).toHaveBeenCalledTimes(1);
  });

  it("impede cadastro sem pontos validos", async () => {
    const requestCreateChallenge = vi.fn();

    await expect(
      createChallenge(
        {
          description: "Descricao valida do desafio.",
          maxParticipants: "1",
          pillarId: "pilar-1",
          points: "0",
          title: "Desafio",
          type: "individual",
        },
        { requestCreateChallenge }
      )
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: {
        points: "Informe uma pontuacao fixa maior que zero.",
      },
    });
    expect(requestCreateChallenge).not.toHaveBeenCalled();
  });

  it("envia cadastro valido para API e retorna mensagem amigavel", async () => {
    const requestCreateChallenge = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        descricao: "Descricao valida do desafio.",
        max_participantes: 1,
        pilarNome: "Pratica",
        pontos: 10,
        status: "ativo",
        tipo: "individual",
        titulo: "Desafio",
      },
    });

    await expect(
      createChallenge(
        {
          description: "Descricao valida do desafio.",
          maxParticipants: "1",
          pillarId: "pilar-1",
          points: "10",
          status: "ativo",
          title: "Desafio",
          type: "individual",
        },
        { requestCreateChallenge }
      )
    ).resolves.toMatchObject({
      ok: true,
      data: {
        points: 10,
        title: "Desafio",
      },
      message: "Desafio cadastrado com sucesso.",
    });
    expect(requestCreateChallenge).toHaveBeenCalledWith({
      descricao: "Descricao valida do desafio.",
      max_participantes: 1,
      pilarId: "pilar-1",
      pontos: 10,
      status: "ativo",
      tipo: "individual",
      titulo: "Desafio",
    });
  });
});
