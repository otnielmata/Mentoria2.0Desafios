import { describe, expect, it, vi } from "vitest";
import { submitChallengeSubmission } from "@/controllers/challenge-submission.controller";

const validPayload = {
  desafioId: "6814f12ab3f34872f7558f43",
  description: "Publiquei um artigo tecnico sobre o desafio.",
  evidence: "https://exemplo.com/evidencia",
  participants: "",
  pilarId: "compartilhamento",
  turmaId: "6814f12ab3f34872f7558f44",
  type: "individual",
};

describe("controllers/challenge-submission", () => {
  it("impede envio sem evidencia antes de chamar a API", async () => {
    const submitRequest = vi.fn();

    await expect(
      submitChallengeSubmission({ ...validPayload, evidence: "" }, { submitRequest })
    ).resolves.toMatchObject({
      fieldErrors: {
        evidence: "Informe uma evidencia, link, texto ou comprovante.",
      },
      ok: false,
    });
    expect(submitRequest).not.toHaveBeenCalled();
  });

  it("normaliza sucesso da API como envio pendente", async () => {
    const submitRequest = vi.fn().mockResolvedValue({
      ok: true,
      data: { id: "envio-1", status: "pendente" },
    });

    await expect(submitChallengeSubmission(validPayload, { submitRequest })).resolves.toMatchObject({
      data: {
        id: "envio-1",
        status: "pendente",
      },
      message: "Desafio enviado com status pendente.",
      ok: true,
    });
    expect(submitRequest).toHaveBeenCalledTimes(1);
  });

  it("mapeia erro de evidencia retornado pela API para o campo da tela", async () => {
    const submitRequest = vi.fn().mockResolvedValue({
      details: [{ field: "evidencias", message: "Evidencia obrigatoria." }],
      message: "Dados invalidos.",
      ok: false,
      type: "validation",
    });

    await expect(submitChallengeSubmission(validPayload, { submitRequest })).resolves.toMatchObject({
      fieldErrors: {
        evidence: "Evidencia obrigatoria.",
      },
      ok: false,
    });
  });
});
