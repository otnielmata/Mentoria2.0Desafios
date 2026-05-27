const profileService = require("../services/profile.service");

async function updateMe(req, res, next) {
  try {
    const user = await profileService.updateAuthenticatedUser(req.user.id, req.body);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  updateMe,
};
