export const apiEndpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },
  configurations: {
    collection: "/api/configuracoes",
  },
  dashboard: {
    admin: "/api/dashboard/admin",
    student: "/api/dashboard/aluno",
  },
  groups: {
    collection: "/api/grupos",
  },
  challengeSubmissions: {
    approvals: "/api/envios-desafios/aprovacoes",
    create: "/api/envios-desafios",
    mine: "/api/envios-desafios/meus",
  },
  challenges: {
    collection: "/api/desafios",
  },
  scores: {
    mine: "/api/pontuacoes/minha",
  },
  ranking: {
    general: "/api/ranking",
  },
  classes: {
    collection: "/api/turmas",
  },
  pillars: {
    collection: "/api/pilares",
  },
  users: {
    collection: "/api/users",
    me: "/api/users/me",
  },
};
