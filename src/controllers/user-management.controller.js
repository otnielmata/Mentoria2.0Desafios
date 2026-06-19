const userManagementService = require("../services/user-management.service");

async function create(req, res, next) {
  try {
    const user = await userManagementService.createManagedUser(req.user.id, req.body);
    return res.status(201).json({ user, usuario: user });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await userManagementService.listManagedUsers(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const user = await userManagementService.getManagedUser(req.user.id, req.params.id);
    return res.status(200).json({ user, usuario: user });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const user = await userManagementService.updateManagedUser(req.user.id, req.params.id, req.body);
    return res.status(200).json({ user, usuario: user });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const user = await userManagementService.deleteManagedUser(req.user.id, req.params.id);
    return res.status(200).json({ user, usuario: user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  remove,
  show,
  update,
};
