/** Dependency-free formatting helpers (safe for client, server and tests). */

export function formatDate(value: string | Date | null | undefined, style: "long" | "short" = "long"): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` format used by <input type="datetime-local">. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? singular : plural}`;
}
