export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL("../" + specifier.slice(2), import.meta.url);
    if (!/\.(ts|tsx|mjs|js|json)$/.test(url.pathname)) url.pathname += ".ts";
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}
