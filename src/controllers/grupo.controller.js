const grupoService = require("../services/grupo.service");

async function list(req, res, next) {
  try {
    const result = await grupoService.listGrupos(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateContact(req, res, next) {
  try {
    const grupo = await grupoService.updateGroupContact(req.user.id, req.params.id, req.body);
    return res.status(200).json({ grupo });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  updateContact,
};
