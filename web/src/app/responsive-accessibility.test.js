import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readGlobalCss() {
  return fs.readFileSync(path.join(appRoot, "globals.css"), "utf8");
}

describe("app/globals accessibility and responsive contracts", () => {
  it("mantem foco visivel, skip link e contraste por tema", () => {
    const source = readGlobalCss();

    expect(source).toContain("--focus-ring");
    expect(source).toContain("*:focus-visible");
    expect(source).toContain(".skip-link");
    expect(source).toContain(".visually-hidden");
  });

  it("mantem regras responsivas para mobile sem rolagem horizontal indevida", () => {
    const source = readGlobalCss();

    expect(source).toContain("overflow-x: clip");
    expect(source).toContain("@media (max-width: 880px)");
    expect(source).toContain("@media (max-width: 560px)");
    expect(source).toContain("grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr)");
    expect(source).toContain("grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr)");
  });

  it("respeita preferencia de reducao de movimento", () => {
    const source = readGlobalCss();

    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).toContain("transition-duration: 1ms");
  });
});
