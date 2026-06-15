import { toGroupsDto } from "@/models/groups.model";
import { listGroupsRequest } from "@/services/groups.service";

export async function getGroups({ requestGroups = listGroupsRequest } = {}) {
  const result = await requestGroups();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toGroupsDto(result.data),
  };
}
