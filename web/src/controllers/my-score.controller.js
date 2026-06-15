import { toMyScoreDto } from "@/models/my-score.model";
import { getMyScoreRequest } from "@/services/my-score.service";

export async function getMyScore({ requestScore = getMyScoreRequest } = {}) {
  const result = await requestScore();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toMyScoreDto(result.data),
  };
}
