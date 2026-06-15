import { cleanText } from "@/models/validation.model";

export const methodPillarNames = [
  "Conhecimento Tecnico Alinhado ao Mercado",
  "Posicionamento e Softskills",
  "Pratica",
  "Exposicao a Problemas",
  "Compartilhamento",
  "Networking",
  "Visibilidade",
];

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function getPillarPayload(payload = {}) {
  return payload.pilar || payload.pillar || payload.topic || payload.topico || payload.data || payload;
}

function getPillarsPayload(payload = {}) {
  const candidates = [
    payload.pilares,
    payload.pillars,
    payload.topicos,
    payload.topics,
    payload.items,
    payload.results,
    payload.data,
    payload,
  ];
  const list = candidates.find(Array.isArray);

  return list || [];
}

export function toPillarDto(payload = {}) {
  const data = getPillarPayload(payload);

  return {
    description: cleanText(pickFirst(data, ["descricao", "description", "resumo", "summary"], "")),
    id: cleanText(pickFirst(data, ["id", "_id", "pilarId", "pillarId"], "")),
    name: cleanText(pickFirst(data, ["nome", "name", "titulo", "title"], "Pilar")),
    status: cleanText(pickFirst(data, ["status", "situacao"], "ativo")),
  };
}

export function toPillarsDto(payload = {}) {
  return getPillarsPayload(payload).map(toPillarDto);
}

export function hasAllMethodPillars(pillars = []) {
  const names = new Set(pillars.map((pillar) => pillar.name));

  return methodPillarNames.every((name) => names.has(name));
}

export function toPillarSelectOptions(pillars = []) {
  return pillars
    .map((pillar) => ({
      label: pillar.name,
      value: pillar.id || pillar.name,
    }))
    .filter((pillar) => pillar.value && pillar.label);
}
