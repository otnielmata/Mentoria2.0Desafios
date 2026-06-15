import { roleLabels, roles } from "@/config/access-control";
import {
  cleanText,
  createValidationError,
  createValidationSuccess,
  isEmail,
} from "@/models/validation.model";

export const userStatusLabels = {
  ativo: "Ativo",
  bloqueado: "Bloqueado",
  inativo: "Inativo",
  pendente: "Pendente",
};

export const userRoleOptions = [
  { label: roleLabels[roles.student], value: roles.student },
  { label: roleLabels[roles.teacher], value: roles.teacher },
  { label: roleLabels[roles.admin], value: roles.admin },
];

export const userStatusOptions = Object.entries(userStatusLabels).map(([value, label]) => ({
  label,
  value,
}));

export const initialUserForm = {
  email: "",
  name: "",
  role: roles.student,
  status: "ativo",
};

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function getUserPayload(payload = {}) {
  return payload.user || payload.usuario || payload.aluno || payload.data || payload;
}

function getUsersPayload(payload = {}) {
  const candidates = [
    payload.users,
    payload.usuarios,
    payload.alunos,
    payload.items,
    payload.results,
    payload.data,
    payload,
  ];
  const list = candidates.find(Array.isArray);

  return list || [];
}

function toTurmaLabel(value) {
  if (Array.isArray(value)) {
    return value
      .map(toTurmaLabel)
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return cleanText(value.nome || value.name || value.codigo || value.code || value.id || value._id);
  }

  return cleanText(value);
}

export function normalizeUserRole(role = "") {
  return Object.values(roles).includes(role) ? role : roles.student;
}

export function normalizeUserStatus(status = "") {
  const value = cleanText(status).toLowerCase();

  return userStatusLabels[value] ? value : "ativo";
}

export function toUserRequestDto(payload = {}) {
  return {
    email: cleanText(payload.email).toLowerCase(),
    name: cleanText(payload.name),
    role: cleanText(payload.role) || roles.student,
    status: cleanText(payload.status).toLowerCase() || "ativo",
  };
}

export function toUserDto(payload = {}) {
  const data = getUserPayload(payload);
  const role = normalizeUserRole(cleanText(pickFirst(data, ["role", "perfil"], roles.student)));
  const status = normalizeUserStatus(pickFirst(data, ["status", "situacao"], "ativo"));

  return {
    email: cleanText(pickFirst(data, ["email", "e_mail"], "")),
    id: cleanText(pickFirst(data, ["id", "_id", "userId", "usuarioId", "alunoId"], "")),
    name: cleanText(pickFirst(data, ["name", "nome"], "Aluno")),
    role,
    roleLabel: roleLabels[role],
    status,
    statusLabel: userStatusLabels[status],
    turma: toTurmaLabel(
      pickFirst(data, ["turma", "turmaNome", "turma_nome", "classe", "class", "turmas"], "")
    ),
  };
}

export function toUsersDto(payload = {}) {
  return getUsersPayload(payload).map(toUserDto);
}

export function validateUserPayload(payload = {}) {
  const dto = toUserRequestDto(payload);
  const fieldErrors = {};

  if (dto.name.length < 2) {
    fieldErrors.name = "Informe o nome do aluno.";
  }

  if (!isEmail(dto.email)) {
    fieldErrors.email = "Informe um e-mail valido.";
  }

  if (!Object.values(roles).includes(dto.role)) {
    fieldErrors.role = "Selecione um papel valido.";
  }

  if (!userStatusLabels[dto.status]) {
    fieldErrors.status = "Selecione um status valido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return createValidationError("Revise os dados do aluno.", fieldErrors);
  }

  return createValidationSuccess(dto);
}
