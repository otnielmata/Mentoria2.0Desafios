const configurationService = require("../services/configuration.service");

function listConfigurations(req, res) {
  return res.status(200).json(configurationService.getInitialConfigurations());
}

module.exports = {
  listConfigurations,
};
