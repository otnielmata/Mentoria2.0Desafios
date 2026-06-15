import { toPillarsDto } from "@/models/pillars.model";
import { listPillarsRequest } from "@/services/pillars.service";

export async function getPillars({ requestPillars = listPillarsRequest } = {}) {
  const result = await requestPillars();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toPillarsDto(result.data),
  };
}
