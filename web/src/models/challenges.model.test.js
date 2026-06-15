import { describe, expect, it } from "vitest";
import {
  challengeTypes,
  initialChallengeForm,
  toChallengeDto,
  toChallengeRequestDto,
  toChallengesDto,
  validateChallengePayload,
} from "@/models/challenges.model";

describe("models/challenges", () => {
  it("normaliza payload de cadastro de desafio para a API", () => {
    expect(
      toChallengeRequestDto({
        description: " Desafio para praticar JavaScript ",
        maxParticipants: "5",
        pillarId: "pilar-1",
        points: "20",
        status: "ATIVO",
        title: " Praticar JS ",
        type: "GRUPO",
      })
    ).toEqual({
      descricao: "Desafio para praticar JavaScript",
      max_participantes: 5,
      pilarId: "pilar-1",
      pontos: 20,
      status: "ativo",
      tipo: "grupo",
      titulo: "Praticar JS",
    });
  });

  it("normaliza desafios retornados pela API", () => {
    expect(
      toChallengeDto({
        _id: "desafio-1",
        descricao: "Publicar artigo tecnico.",
        max_participantes: 1,
        pilar: { _id: "pilar-1", nome: "Compartilhamento" },
        pontos: 30,
        status: "ativo",
        tipo: "individual",
        titulo: "Publicar artigo",
      })
    ).toEqual({
      description: "Publicar artigo tecnico.",
      id: "desafio-1",
      maxParticipants: 1,
      pillarId: "pilar-1",
      pillarName: "Compartilhamento",
      points: 30,
      status: "ativo",
      statusLabel: "Ativo",
      title: "Publicar artigo",
      type: "individual",
      typeLabel: "Individual",
    });
  });

  it("aceita listas em aliases comuns da API", () => {
    expect(
      toChallengesDto({
        desafios: [
          {
            maxParticipantes: 5,
            pilarNome: "Networking",
            points: "15",
            title: "Conectar com mentor",
            type: "ambos",
          },
        ],
      })
    ).toMatchObject([
      {
        maxParticipants: 5,
        pillarName: "Networking",
        points: 15,
        title: "Conectar com mentor",
        typeLabel: "Individual ou grupo",
      },
    ]);
  });

  it("valida pontuacao fixa obrigatoria e limite de grupo", () => {
    const result = validateChallengePayload({
      ...initialChallengeForm,
      description: "Descricao valida do desafio.",
      maxParticipants: "6",
      pillarId: "pilar-1",
      points: "",
      title: "Desafio valido",
      type: challengeTypes.group,
    });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        maxParticipants: "Desafios em grupo aceitam no maximo 5 participantes.",
        points: "Informe uma pontuacao fixa maior que zero.",
      },
      message: "Revise os dados do desafio.",
    });
  });
});
