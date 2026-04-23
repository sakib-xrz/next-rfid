const DHAKA_TIMEZONE = "Asia/Dhaka";

export function formatDhakaDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDhakaTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: DHAKA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function formatDhakaDateTime(value: string | null) {
  if (!value) return "-";
  return `${formatDhakaDate(value)} ${formatDhakaTime(value)}`;
}

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
