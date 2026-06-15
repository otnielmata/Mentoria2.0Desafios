import { toMyChallengeSubmissionsDto } from "@/models/my-challenge-submissions.model";
import { getMyChallengeSubmissionsRequest } from "@/services/my-challenge-submissions.service";

export async function getMyChallengeSubmissions({
  requestSubmissions = getMyChallengeSubmissionsRequest,
} = {}) {
  const result = await requestSubmissions();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toMyChallengeSubmissionsDto(result.data),
  };
}
