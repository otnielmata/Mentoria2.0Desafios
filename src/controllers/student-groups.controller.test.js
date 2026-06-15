const assert = require("node:assert/strict");
const test = require("node:test");
const { createStudentGroupsController } = require("./student-groups.controller");

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

test("student-groups controller retorna meus grupos do aluno autenticado", async () => {
  const controller = createStudentGroupsController({
    async listMyGroups(userId) {
      assert.equal(userId, "aluno-1");
      return { grupos: [{ id: "grupo-1" }] };
    },
  });
  const req = { user: { id: "aluno-1" } };
  const res = createResponse();

  await controller.listMine(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { grupos: [{ id: "grupo-1" }] });
});

test("student-groups controller delega erros para o middleware", async () => {
  const error = new Error("falha");
  const controller = createStudentGroupsController({
    async listMyGroups() {
      throw error;
    },
  });
  const req = { user: { id: "aluno-1" } };
  const res = createResponse();
  let forwardedError = null;

  await controller.listMine(req, res, (nextError) => {
    forwardedError = nextError;
  });

  assert.equal(forwardedError, error);
});
