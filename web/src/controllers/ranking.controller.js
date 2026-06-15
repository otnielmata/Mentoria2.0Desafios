import { toRankingDto } from "@/models/ranking.model";
import { getGeneralRankingRequest } from "@/services/ranking.service";

export async function getGeneralRanking({ requestRanking = getGeneralRankingRequest } = {}) {
  const result = await requestRanking();

  if (!result.ok) {
    if (result.status === 403) {
      return {
        ...result,
        message: "Ranking indisponivel para alunos no momento.",
        type: "ranking_unavailable",
      };
    }

    return result;
  }

  return {
    ...result,
    data: toRankingDto(result.data),
  };
}
