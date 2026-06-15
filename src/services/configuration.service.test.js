const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getInitialConfigurations,
  hasSensitiveContent,
  sanitizeParameter,
} = require("./configuration.service");

test("getInitialConfigurations retorna parâmetros iniciais somente leitura", () => {
  const settings = getInitialConfigurations();

  assert.equal(settings.readOnly, true);
  assert.equal(settings.editingEnabled, false);
  assert.equal(settings.ranking.generalVisibleToStudents, true);
  assert.ok(settings.parameters.length >= 3);
  assert.ok(settings.parameters.every((parameter) => parameter.editable === false));
});

test("getInitialConfigurations não expõe segredos técnicos", () => {
  const settingsText = JSON.stringify(getInitialConfigurations()).toLowerCase();

  assert.equal(settingsText.includes("jwt_secret"), false);
  assert.equal(settingsText.includes("mongodb_uri"), false);
  assert.equal(settingsText.includes("password"), false);
  assert.equal(settingsText.includes("token"), false);
});

test("sanitizeParameter remove chaves ou valores sensíveis", () => {
  assert.equal(hasSensitiveContent("MONGODB_URI"), true);

  const sanitized = sanitizeParameter({
    id: "seguro",
    name: "Seguro",
    token: "abc",
    value: "secret=abc",
  });

  assert.deepEqual(sanitized, {
    id: "seguro",
    name: "Seguro",
  });
});
