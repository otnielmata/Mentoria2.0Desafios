const pilarService = require("../services/pilar.service");

async function list(req, res, next) {
  try {
    const pilares = await pilarService.listPilares(req.user.id, req.query);
    return res.status(200).json({ pilares });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
};
