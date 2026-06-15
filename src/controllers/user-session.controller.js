const userSessionService = require("../services/user-session.service");

function createUserSessionController(sessionService = userSessionService) {
  async function me(req, res, next) {
    try {
      const result = await sessionService.getAuthenticatedUserSession(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  return {
    me,
  };
}

module.exports = {
  ...createUserSessionController(),
  createUserSessionController,
};
