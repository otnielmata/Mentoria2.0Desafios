const { WEB_API_ENDPOINTS } = require("../contracts/api-endpoints");
const { toConfigurationViewModel } = require("../models/configuration.model");

const CONFIGURATION_ENDPOINT_KEY = "admin.settings";

function getConfigurationEndpoint() {
  return WEB_API_ENDPOINTS.find((endpoint) => endpoint.key === CONFIGURATION_ENDPOINT_KEY);
}

async function loadConfigurationView(apiClient) {
  if (!apiClient || typeof apiClient.request !== "function") {
    throw new Error("Cliente da API é obrigatório para carregar configurações.");
  }

  const configuration = await apiClient.request(getConfigurationEndpoint());
  return toConfigurationViewModel(configuration);
}

module.exports = {
  CONFIGURATION_ENDPOINT_KEY,
  getConfigurationEndpoint,
  loadConfigurationView,
};
