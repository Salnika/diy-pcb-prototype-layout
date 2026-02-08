export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  const rand = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  return `${prefix}_${time}_${rand}`;
}

