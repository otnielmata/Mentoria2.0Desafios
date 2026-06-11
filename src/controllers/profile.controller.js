const profileService = require("../services/profile.service");

async function showMe(req, res, next) {
  try {
    const user = await profileService.getMe(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await profileService.updateMe(req.user.id, req.body);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  showMe,
  updateMe,
};
