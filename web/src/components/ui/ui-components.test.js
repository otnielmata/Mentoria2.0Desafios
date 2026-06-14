import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readComponent(name) {
  return fs.readFileSync(path.join(uiRoot, name), "utf8");
}

describe("components/ui", () => {
  it("mantem Button com variantes e estados loading/disabled", () => {
    const source = readComponent("Button.js");

    expect(source).toContain("button-${variant}");
    expect(source).toContain("button-loading");
    expect(source).toContain("aria-busy");
    expect(source).toContain("aria-disabled");
    expect(source).toContain("disabled={isNativeButton ? disabled : undefined}");
    expect(source).toContain("handleClick");
  });

  it("mantem Input com label, ajuda, erro e atributos acessiveis", () => {
    const source = readComponent("Input.js");

    expect(source).toContain("field-group");
    expect(source).toContain("htmlFor");
    expect(source).toContain("id={inputId}");
    expect(source).toContain("field-help");
    expect(source).toContain("field-error");
    expect(source).toContain("aria-invalid");
    expect(source).toContain("aria-describedby");
    expect(source).toContain("aria-errormessage");
  });

  it("mantem Textarea com o mesmo contrato de erro do Input", () => {
    const source = readComponent("Textarea.js");

    expect(source).toContain("field-group");
    expect(source).toContain("htmlFor");
    expect(source).toContain("id={textareaId}");
    expect(source).toContain("field-help");
    expect(source).toContain("field-error");
    expect(source).toContain("aria-errormessage");
    expect(source).toContain("<textarea");
  });

  it("mantem Select com label, ajuda e erro acessivel", () => {
    const source = readComponent("Select.js");

    expect(source).toContain("field-group");
    expect(source).toContain("htmlFor");
    expect(source).toContain("id={selectId}");
    expect(source).toContain("field-help");
    expect(source).toContain("field-error");
    expect(source).toContain("aria-invalid");
    expect(source).toContain("aria-errormessage");
    expect(source).toContain("<select");
  });

  it("mantem componentes de feedback sem textos de negocio fixos", () => {
    const source = readComponent("Feedback.js");

    expect(source).toContain("LoadingState");
    expect(source).toContain("ErrorState");
    expect(source).toContain("EmptyState");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("{message}");
    expect(source).toContain("{children}");
  });

  it("mantem Alert anunciado por tecnologias assistivas", () => {
    const source = readComponent("Alert.js");

    expect(source).toContain("aria-live");
    expect(source).toContain("role={isError ? \"alert\" : \"status\"}");
  });

  it("mantem DataList como painel reutilizavel", () => {
    const source = readComponent("DataList.js");

    expect(source).toContain("list-panel");
    expect(source).toContain("aria-live");
    expect(source).toContain("{children}");
  });

  it("mantem ErrorFallback sem detalhes tecnicos da falha", () => {
    const source = readComponent("ErrorFallback.js");

    expect(source).toContain("Erro inesperado");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("stack");
  });
});
