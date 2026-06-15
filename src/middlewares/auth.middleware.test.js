const assert = require("node:assert/strict");
const test = require("node:test");
const authMiddleware = require("./auth.middleware");
const { generateToken } = require("../services/token.service");

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

test("authMiddleware popula req.user com id, e-mail, role e status do token", () => {
  const token = generateToken({
    email: "admin@example.com",
    role: "admin",
    status: "ativo",
    sub: "user-1",
  });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let called = false;

  authMiddleware(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.deepEqual(req.user, {
    email: "admin@example.com",
    id: "user-1",
    role: "admin",
    status: "ativo",
  });
});

test("authMiddleware bloqueia requisição sem token", () => {
  const res = createResponse();

  authMiddleware({ headers: {} }, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Token não informado.");
});
