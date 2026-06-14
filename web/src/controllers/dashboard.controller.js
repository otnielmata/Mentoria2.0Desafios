import { toStudentDashboardDto } from "@/models/dashboard.model";
import { getStudentDashboardRequest } from "@/services/dashboard.service";

export async function getStudentDashboard({ requestDashboard = getStudentDashboardRequest } = {}) {
  const result = await requestDashboard();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toStudentDashboardDto(result.data),
  };
}
