const cupomService = require("../services/cupom.service");

async function listStudents(req, res, next) {
  try {
    const result = await cupomService.listStudentCoupons(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function distributeLuckyNumbers(req, res, next) {
  try {
    const result = await cupomService.distributeLuckyNumbers(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listLuckyNumberStudents(req, res, next) {
  try {
    const result = await cupomService.listStudentLuckyNumbers(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listLuckyNumberCoupons(req, res, next) {
  try {
    const result = await cupomService.listLuckyNumberCoupons(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  distributeLuckyNumbers,
  listLuckyNumberCoupons,
  listLuckyNumberStudents,
  listStudents,
};
