import { roleLabels, roles } from "@/config/access-control";

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function toList(value) {
  return Array.isArray(value) ? value : [];
}

function getProfilePayload(payload = {}) {
  return payload.user || payload.usuario || payload.profile || payload.data || payload;
}

export function normalizeProfileRole(role = "") {
  return Object.values(roles).includes(role) ? role : roles.student;
}

export function toProfileDto(payload = {}) {
  const data = getProfilePayload(payload);
  const role = normalizeProfileRole(toText(pickFirst(data, ["role", "perfil"], roles.student)));

  return {
    email: toText(pickFirst(data, ["email", "e_mail"], "")),
    id: toText(pickFirst(data, ["id", "_id", "userId", "usuarioId"], "")),
    name: toText(pickFirst(data, ["name", "nome"], "Usuario")),
    role,
    roleLabel: roleLabels[role],
    status: toText(pickFirst(data, ["status", "situacao"], "ativo")),
    turmas: toList(pickFirst(data, ["turmas", "classes"], []))
      .map((item) => {
        if (!item || typeof item !== "object") {
          return toText(item);
        }

        return toText(item.name || item.nome || item.code || item.codigo || item.id || item._id);
      })
      .filter(Boolean),
  };
}
