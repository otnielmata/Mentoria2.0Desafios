const profileService = require("../services/profile.service");

async function getMe(req, res, next) {
  try {
    const user = await profileService.getAuthenticatedUser(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await profileService.updateAuthenticatedUser(req.user.id, req.body);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMe,
  updateMe,
};
