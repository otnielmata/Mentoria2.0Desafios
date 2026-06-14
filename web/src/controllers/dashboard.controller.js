import { toAdminDashboardDto, toStudentDashboardDto } from "@/models/dashboard.model";
import {
  getAdminDashboardRequest,
  getStudentDashboardRequest,
} from "@/services/dashboard.service";

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

export async function getAdminDashboard({ requestDashboard = getAdminDashboardRequest } = {}) {
  const result = await requestDashboard();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toAdminDashboardDto(result.data),
  };
}
