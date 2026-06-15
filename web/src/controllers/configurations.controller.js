import { toConfigurationsDto } from "@/models/configurations.model";
import { getConfigurationsRequest } from "@/services/configurations.service";

export async function getConfigurations({ requestConfigurations = getConfigurationsRequest } = {}) {
  const result = await requestConfigurations();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toConfigurationsDto(result.data),
  };
}
