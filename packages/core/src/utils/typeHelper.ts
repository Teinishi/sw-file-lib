export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object";
}

export function isStringKeyRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).every((k) => typeof k === "string");
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  return isStringKeyRecord(value) && Object.values(value).every((v) => typeof v === "string");
}
