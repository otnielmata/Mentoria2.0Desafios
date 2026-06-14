import { toUserDto, toUsersDto, validateUserPayload } from "@/models/users.model";
import { withApiFieldErrors } from "@/models/validation.model";
import { createUserRequest, listUsersRequest } from "@/services/users.service";

function normalizeUserFieldErrors(result) {
  const fieldErrors = { ...(result.fieldErrors || {}) };
  const aliases = {
    e_mail: "email",
    nome: "name",
    papel: "role",
    perfil: "role",
    situacao: "status",
  };

  Object.entries(aliases).forEach(([apiField, viewField]) => {
    if (fieldErrors[apiField] && !fieldErrors[viewField]) {
      fieldErrors[viewField] = fieldErrors[apiField];
      delete fieldErrors[apiField];
    }
  });

  return {
    ...result,
    fieldErrors,
  };
}

export async function getUsers({ requestUsers = listUsersRequest } = {}) {
  const result = await requestUsers();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toUsersDto(result.data),
  };
}

export async function createUser(payload, { requestCreateUser = createUserRequest } = {}) {
  const validation = validateUserPayload(payload);

  if (!validation.ok) {
    return validation;
  }

  const result = normalizeUserFieldErrors(withApiFieldErrors(await requestCreateUser(validation.data)));

  if (!result.ok) {
    return result;
  }

  const user = toUserDto(result.data);

  return {
    ...result,
    data: user,
    message: `${user.roleLabel} cadastrado com sucesso.`,
  };
}
