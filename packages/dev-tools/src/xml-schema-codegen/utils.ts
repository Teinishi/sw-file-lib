export function splitArgs(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;

    if (quote) {
      if (c === quote) {
        quote = null;
      } else {
        current += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }

    if (/\s/.test(c)) {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }

    current += c;
  }

  if (quote) {
    throw new Error("Unclosed quote");
  }

  if (current) {
    result.push(current);
  }

  return result;
}
