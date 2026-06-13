import {
  buildEmptyHeuristicsState,
  normalizeHeuristicList,
  validateHeuristicPayload,
} from "@/models/heuristic.model";
import {
  createHeuristicRequest,
  listHeuristicsRequest,
} from "@/services/heuristic.service";

export async function listHeuristics() {
  const result = await listHeuristicsRequest();

  if (!result.ok) {
    return result;
  }

  const data = normalizeHeuristicList(result.data);

  return {
    ok: true,
    data,
    emptyState: buildEmptyHeuristicsState(data),
  };
}

export async function createHeuristic(payload) {
  const validation = validateHeuristicPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  return createHeuristicRequest(validation.data);
}
