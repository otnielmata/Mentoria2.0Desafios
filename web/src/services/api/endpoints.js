export const apiEndpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
  },
  dashboard: {
    admin: "/api/dashboard/admin",
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
