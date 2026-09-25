import { cp, access } from "node:fs/promises";

await access(".next/standalone/server.js");
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
try {
  await access("public");
  await cp("public", ".next/standalone/public", { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log("CareCall standalone assets prepared.");
