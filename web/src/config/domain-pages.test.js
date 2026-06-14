import { describe, expect, it } from "vitest";
import { domainPages } from "@/config/domain-pages";

describe("config/domain-pages", () => {
  it("mantem o conteudo no dominio de desafios da mentoria", () => {
    const legacyToken = ["he", "ur"].join("");

    expect(JSON.stringify(domainPages).toLowerCase()).not.toContain(legacyToken);
    expect(domainPages.registrarDesafio.title).toBe("Registrar desafio");
    expect(domainPages.ranking.highlights).toContain("Por turma");
  });

  it("mantem os sete pilares do Metodo do Alavanque", () => {
    expect(domainPages.pilares.highlights).toEqual([
      "Conhecimento Tecnico Alinhado ao Mercado",
      "Posicionamento e Softskills",
      "Pratica",
      "Exposicao a Problemas",
      "Compartilhamento",
      "Networking",
      "Visibilidade",
    ]);
  });
});
