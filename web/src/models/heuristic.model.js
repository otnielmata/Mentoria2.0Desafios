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
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.heuristicas)
        ? data.heuristicas
        : [];

  return items.map((item) => ({
    id: item.id || item._id || item.titulo || item.title,
    titulo: item.titulo || item.title || "Sem titulo",
    descricao: item.descricao || item.description || "Sem descricao",
  }));
}

export function buildEmptyHeuristicsState(items) {
  if (items.length > 0) {
    return null;
  }

  return {
    title: "Nenhuma heuristica encontrada.",
    description: "Quando houver heuristicas disponiveis, elas aparecerao aqui.",
  };
}
