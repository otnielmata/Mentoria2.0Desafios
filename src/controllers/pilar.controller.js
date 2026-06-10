const pilarService = require("../services/pilar.service");

async function show(req, res, next) {
  try {
    const pilar = await pilarService.getPilarById(req.user.id, req.params.id);
    return res.status(200).json({ pilar });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  show,
};
