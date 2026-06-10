const pilarService = require("../services/pilar.service");

async function create(req, res, next) {
  try {
    const pilar = await pilarService.createPilar(req.user.id, req.body);
    return res.status(201).json({ pilar });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
};
