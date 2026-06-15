const studentGroupsService = require("../services/student-groups.service");

function createStudentGroupsController(groupsService = studentGroupsService) {
  async function listMine(req, res, next) {
    try {
      const result = await groupsService.listMyGroups(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  return {
    listMine,
  };
}

module.exports = {
  ...createStudentGroupsController(),
  createStudentGroupsController,
};
