const assert = require("node:assert/strict");
const test = require("node:test");
const User = require("./user.model");

test("User aplica perfil aluno e status ativo por padrão", () => {
  const user = new User({
    email: "aluno@example.com",
    name: "Aluno Teste",
    passwordHash: "hash",
  });

  assert.equal(user.role, User.userRoles.student);
  assert.equal(user.status, User.userStatuses.active);
});

test("User expõe enums de perfis previstos pela regra de negócio", () => {
  assert.deepEqual(Object.values(User.userRoles).sort(), ["admin", "aluno", "professor"]);
});
