import type { XContentType } from "@/types";

export const DISCLAIMER = "Educational research only. Not investment advice.";

export const X_CONTENT_OPTIONS: Array<{ value: XContentType; label: string }> = [
  { value: "single", label: "Short single post" },
  { value: "thread", label: "Four-post thread" },
  { value: "educational", label: "Educational concept" },
  { value: "driver", label: "Driver breakdown" },
  { value: "weekly-recap", label: "Weekly recap" },
  { value: "contrarian", label: "Contrarian / risk" },
];
