export const roles = {
  student: "aluno",
  teacher: "professor",
  admin: "admin",
};

export const defaultAuthenticatedPath = "/dashboard";
export const loginPath = "/login";

export const roleLabels = {
  [roles.student]: "Aluno",
  [roles.teacher]: "Professor",
  [roles.admin]: "Admin",
};

export const publicNavigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/login", label: "Entrar" },
  { href: "/registro", label: "Registrar" },
];

export const authenticatedNavigationItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    roles: [roles.student],
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/registrar-desafio",
    label: "Registrar Desafio",
    roles: [roles.student],
  },
  {
    href: "/meus-desafios",
    label: "Meus Desafios",
    roles: [roles.student],
  },
  {
    href: "/minha-pontuacao",
    label: "Minha Pontuacao",
    roles: [roles.student],
  },
  {
    href: "/meus-grupos",
    label: "Meus Grupos",
    roles: [roles.student],
  },
  {
    href: "/ranking",
    label: "Ranking",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    href: "/perfil",
    label: "Meu Perfil",
    roles: [roles.student],
  },
  {
    href: "/alunos",
    label: "Alunos",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/turmas",
    label: "Turmas",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/pilares",
    label: "Pilares",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/desafios",
    label: "Desafios",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/aprovacoes",
    label: "Aprovacoes",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/grupos",
    label: "Grupos",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    roles: [roles.teacher, roles.admin],
  },
  {
    href: "/configuracoes",
    label: "Configuracoes",
    roles: [roles.teacher, roles.admin],
  },
];

export const routeRules = [
  { access: "public", path: "/" },
  { access: "public", path: "/login" },
  { access: "public", path: "/registro" },
  {
    access: "protected",
    path: "/dashboard",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/registrar-desafio",
    roles: [roles.student],
  },
  {
    access: "protected",
    path: "/meus-desafios",
    roles: [roles.student],
  },
  {
    access: "protected",
    path: "/minha-pontuacao",
    roles: [roles.student],
  },
  {
    access: "protected",
    path: "/meus-grupos",
    roles: [roles.student],
  },
  {
    access: "protected",
    path: "/ranking",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/perfil",
    roles: [roles.student, roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/alunos",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/turmas",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/pilares",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/desafios",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/aprovacoes",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/grupos",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/relatorios",
    roles: [roles.teacher, roles.admin],
  },
  {
    access: "protected",
    path: "/configuracoes",
    roles: [roles.teacher, roles.admin],
  },
];

export function normalizePathname(pathname = "/") {
  const cleanPath = pathname.split("?")[0].split("#")[0] || "/";
  const withoutTrailingSlash = cleanPath.length > 1 ? cleanPath.replace(/\/+$/, "") : cleanPath;

  return withoutTrailingSlash || "/";
}

export function normalizeRole(role) {
  return Object.values(roles).includes(role) ? role : "";
}

export function routeMatchesPath(routePath, pathname) {
  const normalizedRoute = normalizePathname(routePath);
  const normalizedPath = normalizePathname(pathname);

  if (normalizedRoute === "/") {
    return normalizedPath === normalizedRoute;
  }

  return normalizedPath === normalizedRoute || normalizedPath.startsWith(`${normalizedRoute}/`);
}

export function findRouteRule(pathname = "/") {
  return routeRules.find((rule) => routeMatchesPath(rule.path, pathname)) || null;
}

export function isPublicRoute(pathname = "/") {
  return findRouteRule(pathname)?.access === "public";
}

export function isProtectedRoute(pathname = "/") {
  return findRouteRule(pathname)?.access === "protected";
}

export function hasAuthenticatedSession(session) {
  return Boolean(session?.token);
}

export function hasValidSessionProfile(session) {
  return Boolean(normalizeRole(session?.user?.role));
}

export function getUserRole(session) {
  return normalizeRole(session?.user?.role);
}

export function getAuthorizedNavigationItems(role) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return [];
  }

  return authenticatedNavigationItems.filter((item) => item.roles.includes(normalizedRole));
}

export function getLoginRedirectPath(targetPath = defaultAuthenticatedPath) {
  return `${loginPath}?redirect=${encodeURIComponent(targetPath)}`;
}

export function isSafeRedirectPath(path) {
  if (!path || typeof path !== "string") {
    return false;
  }

  let decodedPath = path;

  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return false;
  }

  if (!decodedPath.startsWith("/") || decodedPath.startsWith("//")) {
    return false;
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(decodedPath)) {
    return false;
  }

  return !["/login", "/registro"].includes(normalizePathname(decodedPath));
}

export function resolvePostLoginRedirect(path) {
  if (!isSafeRedirectPath(path)) {
    return defaultAuthenticatedPath;
  }

  return decodeURIComponent(path);
}

export function getRouteAccessDecision({ pathname = "/", session = null } = {}) {
  const rule = findRouteRule(pathname);

  if (!rule || rule.access === "public") {
    return { allowed: true, reason: rule ? "public-route" : "unregistered-route" };
  }

  if (!hasAuthenticatedSession(session)) {
    return {
      allowed: false,
      reason: "missing-session",
      redirectTo: getLoginRedirectPath(pathname),
    };
  }

  if (!hasValidSessionProfile(session)) {
    return {
      allowed: false,
      reason: "invalid-session",
      redirectTo: getLoginRedirectPath(pathname),
    };
  }

  const userRole = getUserRole(session);

  if (!rule.roles.includes(userRole)) {
    return {
      allowed: false,
      reason: "forbidden-role",
      requiredRoles: rule.roles,
      userRole,
    };
  }

  return { allowed: true, reason: "authorized-route", userRole };
}
