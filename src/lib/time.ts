const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

export function formatMalaysiaDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MALAYSIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatMalaysiaTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: MALAYSIA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function formatMalaysiaDateTime(value: string | null) {
  if (!value) return "-";
  return `${formatMalaysiaDate(value)} ${formatMalaysiaTime(value)}`;
}

// Backward-compatible aliases while UI migrates naming.
export const formatDhakaDate = formatMalaysiaDate;
export const formatDhakaTime = formatMalaysiaTime;
export const formatDhakaDateTime = formatMalaysiaDateTime;

export function formatDuration(seconds: number | null) {
  if (seconds === null) return "-";

  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${secs}`;
}
