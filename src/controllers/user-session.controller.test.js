const assert = require("node:assert/strict");
const test = require("node:test");
const { createUserSessionController } = require("./user-session.controller");

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

test("user-session controller retorna sessão segura do usuário autenticado", async () => {
  const controller = createUserSessionController({
    async getAuthenticatedUserSession(userId) {
      assert.equal(userId, "user-1");
      return {
        user: {
          email: "aluno@example.com",
          id: "user-1",
          name: "Aluno",
          role: "aluno",
          status: "ativo",
        },
      };
    },
  });
  const req = { user: { id: "user-1" } };
  const res = createResponse();

  await controller.me(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.user, {
    email: "aluno@example.com",
    id: "user-1",
    name: "Aluno",
    role: "aluno",
    status: "ativo",
  });
});

test("user-session controller delega erro para middleware", async () => {
  const error = new Error("falha");
  const controller = createUserSessionController({
    async getAuthenticatedUserSession() {
      throw error;
    },
  });
  const res = createResponse();
  let forwardedError = null;

  await controller.me({ user: { id: "user-1" } }, res, (nextError) => {
    forwardedError = nextError;
  });

  assert.equal(forwardedError, error);
});
