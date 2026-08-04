export function isRecord(val: unknown): val is Record<PropertyKey, unknown> {
  return val !== null && typeof val === "object";
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((v) => typeof v === "string");
}
