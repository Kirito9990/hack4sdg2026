export function effectiveRequestText(typed: string, spoken: string) {
  return typed.trim() || spoken.trim();
}
