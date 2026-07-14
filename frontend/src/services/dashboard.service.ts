import { apiRequest } from "@/lib/api";
import type { Dashboard } from "@/types/api";

export const dashboardApi = {
  get() {
    return apiRequest<{ dashboard: Dashboard }>({
      method: "GET",
      url: "/dashboard",
    });
  },
};
