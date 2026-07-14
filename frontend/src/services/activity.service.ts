import { apiRequest } from "@/lib/api";
import type { ActivityDayDetail, ActivityHeatmap } from "@/types/api";

export const activityApi = {
  getHeatmap() {
    return apiRequest<{ activity: ActivityHeatmap }>({
      method: "GET",
      url: "/activity/heatmap",
    });
  },

  getDay(date: string) {
    return apiRequest<{ day: ActivityDayDetail }>({
      method: "GET",
      url: `/activity/day/${date}`,
    });
  },
};
