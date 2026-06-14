import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const controllerPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "form.controller.js");

function readController() {
  return fs.readFileSync(controllerPath, "utf8");
}

describe("controllers/form", () => {
  it("mantem ciclo padronizado de submissao e bloqueio de reenvio", () => {
    const source = readController();

    expect(source).toContain("submittingRef.current");
    expect(source).toContain("createLoadingFormStatus");
    expect(source).toContain("createStatusFromResult");
    expect(source).toContain("clearSensitiveValues");
  });
});
