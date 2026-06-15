const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ensureActiveUser,
  generateUserToken,
  getSafeUser,
} = require("./auth.service");
const { verifyToken } = require("./token.service");

test("getSafeUser retorna role e status sem expor dados sensíveis", () => {
  const safeUser = getSafeUser({
    email: "aluno@example.com",
    id: "user-1",
    name: "Aluno",
    password: "senha",
    passwordHash: "hash",
    role: "aluno",
    status: "ativo",
    token: "jwt",
  });

  assert.deepEqual(safeUser, {
    email: "aluno@example.com",
    id: "user-1",
    name: "Aluno",
    role: "aluno",
    status: "ativo",
  });
  assert.equal(JSON.stringify(safeUser).includes("hash"), false);
  assert.equal(JSON.stringify(safeUser).includes("senha"), false);
  assert.equal(JSON.stringify(safeUser).includes("jwt"), false);
});

test("generateUserToken inclui dados mínimos para autorização", () => {
  const token = generateUserToken({
    email: "professor@example.com",
    id: "user-2",
    name: "Professor",
    role: "professor",
    status: "ativo",
  });
  const payload = verifyToken(token);

  assert.equal(payload.sub, "user-2");
  assert.equal(payload.email, "professor@example.com");
  assert.equal(payload.role, "professor");
  assert.equal(payload.status, "ativo");
});

test("ensureActiveUser bloqueia usuário inativo com mensagem segura", () => {
  assert.doesNotThrow(() => ensureActiveUser({ status: "ativo" }));

  assert.throws(
    () => ensureActiveUser({ status: "inativo" }),
    (error) => {
      assert.equal(error.statusCode, 403);
      assert.equal(error.message, "Usuário inativo.");
      return true;
    }
  );
});
