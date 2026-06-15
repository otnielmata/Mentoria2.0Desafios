const inscricaoDesafioService = require("./inscricao-desafio.service");

async function listGrupos(authenticatedUserId, query = {}) {
  return inscricaoDesafioService.listGroups(authenticatedUserId, query);
}

async function updateGroupContact(authenticatedUserId, grupoId, payload = {}) {
  return inscricaoDesafioService.updateGroupContact(authenticatedUserId, grupoId, payload);
}

module.exports = {
  listGrupos,
  updateGroupContact,
};
