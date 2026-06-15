const assert = require("node:assert/strict");
const test = require("node:test");
const { authorizeRoles } = require("./authorization.middleware");

function createResponse() {
  return {
    body: null,
    statusCode: null,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

test("authorizeRoles permite perfil autorizado", () => {
  const middleware = authorizeRoles(["professor", "admin"]);
  const req = { user: { role: "professor" } };
  const res = createResponse();
  let called = false;

  middleware(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(res.statusCode, null);
});

test("authorizeRoles bloqueia usuário sem sessão", () => {
  const middleware = authorizeRoles(["admin"]);
  const res = createResponse();

  middleware({}, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Usuário não autenticado.");
});

test("authorizeRoles bloqueia perfil sem permissão", () => {
  const middleware = authorizeRoles(["admin"]);
  const req = { user: { role: "aluno" } };
  const res = createResponse();

  middleware(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Acesso não autorizado para este perfil.");
});
