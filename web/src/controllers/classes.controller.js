import { toClassDto, toClassesDto, validateClassPayload } from "@/models/classes.model";
import { withApiFieldErrors } from "@/models/validation.model";
import { createClassRequest, listClassesRequest } from "@/services/classes.service";

function normalizeClassFieldErrors(result) {
  const fieldErrors = { ...(result.fieldErrors || {}) };
  const aliases = {
    dataFim: "endDate",
    dataInicio: "startDate",
    data_fim: "endDate",
    data_inicio: "startDate",
    fim: "endDate",
    inicio: "startDate",
    nome: "name",
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

export async function getClasses({ requestClasses = listClassesRequest } = {}) {
  const result = await requestClasses();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toClassesDto(result.data),
  };
}

export async function createClass(payload, { requestCreateClass = createClassRequest } = {}) {
  const validation = validateClassPayload(payload);

  if (!validation.ok) {
    return validation;
  }

  const result = normalizeClassFieldErrors(withApiFieldErrors(await requestCreateClass(validation.data)));

  if (!result.ok) {
    return result;
  }

  const turma = toClassDto(result.data);

  return {
    ...result,
    data: turma,
    message: "Turma cadastrada com sucesso.",
  };
}
