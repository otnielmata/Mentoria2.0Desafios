export const roles = {
  student: "aluno",
  teacher: "professor",
  admin: "admin",
};

export const publicRoutes = ["/", "/login", "/registro"];

export const protectedRoutes = ["/dashboard", "/heuristicas"];

export const roleLabels = {
  [roles.student]: "Aluno",
  [roles.teacher]: "Professor",
  [roles.admin]: "Admin",
};

export const globalFeedbackDefaults = {
  loadingLabel: "Carregando dados da aplicacao",
  messageRegionLabel: "Mensagens globais",
};

export const publicNavigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/login", label: "Entrar" },
  { href: "/registro", label: "Registrar" },
];

export const authenticatedNavigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    href: "/heuristicas",
    label: "Heuristicas",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    href: "/alunos",
    label: "Alunos",
    roles: [roles.teacher, roles.admin],
    disabled: true,
  },
  {
    href: "/desafios",
    label: "Desafios",
    roles: [roles.teacher, roles.admin],
    disabled: true,
  },
  {
    href: "/ranking",
    label: "Ranking",
    roles: [roles.student, roles.teacher, roles.admin],
    disabled: true,
  },
];

export function normalizeRole(role) {
  return Object.values(roles).includes(role) ? role : roles.student;
}

export function stripQuery(pathname = "/") {
  return pathname.split("?")[0].split("#")[0] || "/";
}

export function isPublicRoute(pathname = "/") {
  return publicRoutes.includes(stripQuery(pathname));
}

export function isProtectedRoute(pathname = "/") {
  return protectedRoutes.includes(stripQuery(pathname));
}

export function getNavigationItemsForRole(role) {
  const normalizedRole = normalizeRole(role);

  return authenticatedNavigationItems.filter((item) => item.roles.includes(normalizedRole));
}

export function getHomeRouteForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === roles.admin || normalizedRole === roles.teacher) {
    return "/dashboard";
  }

  return "/dashboard";
}
