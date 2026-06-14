import { describe, expect, it } from "vitest";
import {
  initialChallengeSubmissionForm,
  methodPillars,
  parseParticipantIds,
  submissionTypes,
  toChallengeSubmissionRequestDto,
  toChallengeSubmissionResponseDto,
  validateChallengeSubmissionPayload,
} from "@/models/challenge-submission.model";

const validPayload = {
  desafioId: "6814f12ab3f34872f7558f43",
  description: "Publiquei um artigo tecnico sobre o desafio.",
  evidence: "https://exemplo.com/evidencia",
  participants: "",
  pilarId: "compartilhamento",
  turmaId: "6814f12ab3f34872f7558f44",
  type: submissionTypes.individual,
};

describe("models/challenge-submission", () => {
  it("mantem formulario inicial para envio individual", () => {
    expect(initialChallengeSubmissionForm).toMatchObject({
      desafioId: "",
      evidence: "",
      participants: "",
      type: submissionTypes.individual,
    });
  });

  it("mantem os sete pilares do Metodo do Alavanque", () => {
    expect(methodPillars.map((pillar) => pillar.label)).toEqual([
      "Conhecimento Tecnico Alinhado ao Mercado",
      "Posicionamento e Softskills",
      "Pratica",
      "Exposicao a Problemas",
      "Compartilhamento",
      "Networking",
      "Visibilidade",
    ]);
  });

  it("cria DTO compativel com a API para envio individual", () => {
    expect(toChallengeSubmissionRequestDto(validPayload)).toEqual({
      desafioId: "6814f12ab3f34872f7558f43",
      description: "Publiquei um artigo tecnico sobre o desafio.",
      evidencias: ["https://exemplo.com/evidencia"],
      participantes: [],
      pilarId: "compartilhamento",
      turmaId: "6814f12ab3f34872f7558f44",
      type: "individual",
    });
  });

  it("normaliza participantes de grupo e remove duplicidade antes do envio", () => {
    expect(parseParticipantIds("aluno-1, aluno-2\naluno-1")).toEqual(["aluno-1", "aluno-2"]);
    expect(
      toChallengeSubmissionRequestDto({
        ...validPayload,
        participants: "aluno-1, aluno-2",
        type: submissionTypes.group,
      }).participantes
    ).toEqual(["aluno-1", "aluno-2"]);
  });

  it("valida evidencia obrigatoria com erro no campo correto", () => {
    expect(validateChallengeSubmissionPayload({ ...validPayload, evidence: "" })).toMatchObject({
      fieldErrors: {
        evidence: "Informe uma evidencia, link, texto ou comprovante.",
      },
      ok: false,
    });
  });

  it("valida limite de ate 5 participantes em grupo", () => {
    expect(
      validateChallengeSubmissionPayload({
        ...validPayload,
        participants: "a,b,c,d,e,f",
        type: submissionTypes.group,
      })
    ).toMatchObject({
      fieldErrors: {
        participants: "Selecione no maximo 5 participantes.",
      },
      ok: false,
    });
  });

  it("retorna sucesso para envio em grupo valido", () => {
    expect(
      validateChallengeSubmissionPayload({
        ...validPayload,
        participants: "aluno-1, aluno-2",
        type: submissionTypes.group,
      })
    ).toMatchObject({
      data: {
        participantes: ["aluno-1", "aluno-2"],
        type: "grupo",
      },
      ok: true,
    });
  });

  it("normaliza resposta da API com status pendente como padrao", () => {
    expect(toChallengeSubmissionResponseDto({ _id: "envio-1" })).toEqual({
      id: "envio-1",
      status: "pendente",
    });
  });
});
