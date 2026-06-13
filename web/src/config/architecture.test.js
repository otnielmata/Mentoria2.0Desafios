import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  architectureLayers,
  exampleFlows,
  getLayerById,
  isApiIntegrationLayer,
} from "@/config/architecture";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("config/architecture", () => {
  it("documenta as camadas principais da arquitetura MVC moderna", () => {
    expect(architectureLayers.map((layer) => layer.id)).toEqual([
      "routes",
      "views",
      "components",
      "controllers",
      "models",
      "services",
    ]);

    architectureLayers.forEach((layer) => {
      expect(layer.responsibility.length).toBeGreaterThan(20);
      expect(fs.existsSync(path.join(webRoot, layer.path))).toBe(true);
    });
  });

  it("define o fluxo exemplo de login atravessando view, controller, model e service", () => {
    expect(exampleFlows.login).toEqual({
      route: "src/app/login/page.js",
      view: "src/views/auth/LoginView.js",
      controller: "src/controllers/auth.controller.js",
      model: "src/models/auth.model.js",
      service: "src/services/auth.service.js",
      adapter: "src/services/api/client.js",
    });
  });

  it("identifica camadas por id", () => {
    expect(getLayerById("controllers")?.path).toBe("src/controllers");
    expect(getLayerById("inexistente")).toBeNull();
  });

  it("mantem integracoes externas restritas a services/adapters", () => {
    expect(isApiIntegrationLayer("src/services/auth.service.js")).toBe(true);
    expect(isApiIntegrationLayer("src/components/ui/Button.js")).toBe(false);
    expect(isApiIntegrationLayer("src/views/auth/LoginView.js")).toBe(false);
  });

  it("nao monta URLs da API em views ou components", () => {
    const filesToCheck = [
      "src/views/auth/LoginView.js",
      "src/components/ui/Button.js",
      "src/components/ui/Input.js",
      "src/app/login/page.js",
    ];

    filesToCheck.forEach((relativePath) => {
      const source = fs.readFileSync(path.join(webRoot, relativePath), "utf8");
      expect(source).not.toContain("/api/");
      expect(source).not.toContain("http://");
      expect(source).not.toContain("https://");
    });
  });
});
