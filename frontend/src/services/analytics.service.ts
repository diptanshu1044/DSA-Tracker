import { apiRequest } from "@/lib/api";
import type { Analytics } from "@/types/api";

export const analyticsApi = {
  get() {
    return apiRequest<{ analytics: Analytics }>({
      method: "GET",
      url: "/analytics",
    });
  },
};
