export const publicRoutes = [
  { href: "/", label: "Inicio" },
  { href: "/login", label: "Login" },
  { href: "/registro", label: "Registrar usuario" },
];

export const protectedRoutes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/heuristicas", label: "Heuristicas" },
];

export const navigationItems = [
  { href: "/", label: "Inicio" },
  ...protectedRoutes,
];

export function isProtectedRoute(pathname = "") {
  return protectedRoutes.some((route) => pathname === route.href || pathname.startsWith(`${route.href}/`));
}
