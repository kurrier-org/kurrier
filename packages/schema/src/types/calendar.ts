import { z } from "zod";
import type { Dayjs } from "dayjs";


export const calendarViewsList = ["day", "week", "month", "year"] as const;
export type CalendarViewType = z.infer<typeof calendarViewsList>;
export type CalendarState = {
    userTz?: string;
};
