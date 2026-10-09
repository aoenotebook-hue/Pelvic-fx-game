// Database JSONB may reorder object keys. Identity must depend on values, not key order.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalEventJson(value: Record<string, unknown>): string {
  // A receipt is server-owned transport metadata, not an authored learner answer.
  const {serverReceiptTimestamp: _receipt, ...payload} = value;
  return canonicalJson(payload);
}
