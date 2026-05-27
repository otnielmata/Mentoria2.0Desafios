jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/profile.controller", () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
}));

const authMiddleware = require("../../src/middlewares/auth.middleware");
const profileController = require("../../src/controllers/profile.controller");
const profileRoutes = require("../../src/routes/profile.routes");

describe("profile.routes", () => {
  it("protege GET /me com autenticação antes do controller", () => {
    const getMeLayer = profileRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/me" && layer.route.methods.get
    );

    expect(getMeLayer).toBeDefined();
    expect(getMeLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      profileController.getMe,
    ]);
  });

  it("protege PATCH /me com autenticação antes do controller", () => {
    const patchMeLayer = profileRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/me" && layer.route.methods.patch
    );

    expect(patchMeLayer).toBeDefined();
    expect(patchMeLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      profileController.updateMe,
    ]);
  });
});
