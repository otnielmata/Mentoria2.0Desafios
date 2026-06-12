const pilarService = require("../services/pilar.service");

async function list(req, res, next) {
  try {
    const result = await pilarService.listPilares(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
};
