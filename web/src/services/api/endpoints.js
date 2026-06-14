export const apiEndpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },
  dashboard: {
    student: "/api/dashboard/aluno",
  },
  challengeSubmissions: {
    create: "/api/envios-desafios",
    mine: "/api/envios-desafios/meus",
  },
  scores: {
    mine: "/api/pontuacoes/minha",
  },
  ranking: {
    general: "/api/ranking",
  },
  users: {
    me: "/api/users/me",
  },
};
