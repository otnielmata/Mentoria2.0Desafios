const assert = require("node:assert/strict");
const test = require("node:test");
const { sanitizeSessionUser } = require("./user-session.service");

test("sanitizeSessionUser retorna dados seguros de sessão", () => {
  const sessionUser = sanitizeSessionUser({
    _id: "user-1",
    email: "admin@example.com",
    name: "Admin",
    password: "senha",
    passwordHash: "hash",
    privateKey: "segredo",
    role: "admin",
    status: "ativo",
    token: "jwt",
  });

  assert.deepEqual(sessionUser, {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    role: "admin",
    status: "ativo",
  });
  assert.equal(JSON.stringify(sessionUser).includes("hash"), false);
  assert.equal(JSON.stringify(sessionUser).includes("senha"), false);
  assert.equal(JSON.stringify(sessionUser).includes("segredo"), false);
  assert.equal(JSON.stringify(sessionUser).includes("jwt"), false);
});

test("sanitizeSessionUser aplica perfil aluno e status ativo como padrão seguro", () => {
  assert.deepEqual(sanitizeSessionUser({ id: "user-2", email: "aluno@example.com", name: "Aluno" }), {
    email: "aluno@example.com",
    id: "user-2",
    name: "Aluno",
    role: "aluno",
    status: "ativo",
  });
});
