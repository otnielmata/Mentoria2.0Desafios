function cleanText(value) {
  return String(value || "").trim();
}

export function validateHeuristicPayload(payload) {
  const titulo = cleanText(payload.titulo);
  const descricao = cleanText(payload.descricao);

  if (titulo.length < 3) {
    return { ok: false, message: "Informe um titulo com pelo menos 3 caracteres." };
  }

  if (descricao.length < 10) {
    return { ok: false, message: "Informe uma descricao com pelo menos 10 caracteres." };
  }

  return {
    ok: true,
    data: { titulo, descricao },
  };
}

export function normalizeHeuristicList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.heuristicas)) {
    return data.heuristicas;
  }

  return [];
}
