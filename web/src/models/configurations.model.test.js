import { describe, expect, it } from "vitest";
import {
  toConfigurationParameterDto,
  toConfigurationsDto,
} from "@/models/configurations.model";

describe("models/configurations", () => {
  it("normaliza parametros iniciais e visibilidade do ranking", () => {
    const configurations = toConfigurationsDto({
      editingEnabled: false,
      parameters: [
        {
          description: "Define se alunos veem ranking.",
          editable: false,
          id: "ranking-geral-alunos",
          name: "Ranking geral",
          type: "boolean",
          value: true,
        },
      ],
      ranking: {
        generalVisibleToStudents: true,
      },
      readOnly: true,
    });

    expect(configurations).toMatchObject({
      editingEnabled: false,
      isEmpty: false,
      readOnly: true,
      rankingVisibility: {
        isAvailable: true,
        label: "Permitido para alunos",
        value: true,
      },
    });
    expect(configurations.parameters[0]).toMatchObject({
      description: "Define se alunos veem ranking.",
      id: "ranking-geral-alunos",
      name: "Ranking geral",
      statusLabel: "Somente leitura",
      valueLabel: "Ativo",
    });
  });

  it("identifica estado vazio quando a API nao possui configuracoes", () => {
    expect(toConfigurationsDto({ parameters: [] })).toMatchObject({
      isEmpty: true,
      parameters: [],
      rankingVisibility: {
        isAvailable: false,
        label: "Nao informado",
      },
    });
  });

  it("remove parametros com conteudo sensivel", () => {
    expect(
      toConfigurationParameterDto({
        id: "jwt-secret",
        name: "Segredo",
        value: "abc",
      })
    ).toBeNull();

    expect(JSON.stringify(toConfigurationsDto({ parameters: [{ name: "Token", value: "abc" }] }))).not.toContain(
      "abc"
    );
  });
});
