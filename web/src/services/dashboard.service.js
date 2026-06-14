import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function getStudentDashboardRequest(requester = apiRequest) {
  return requester(apiEndpoints.dashboard.student);
}
