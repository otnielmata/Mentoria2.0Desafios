import { toProfileDto } from "@/models/profile.model";
import { getProfileRequest } from "@/services/profile.service";

export async function getProfile({ requestProfile = getProfileRequest } = {}) {
  const result = await requestProfile();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toProfileDto(result.data),
  };
}
