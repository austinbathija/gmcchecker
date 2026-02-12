// Usage: node scripts/generate-password-hash.mjs "your-program-password"

import { scryptSync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/generate-password-hash.mjs <password>");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const combined = `${salt}:${hash}`;

console.log("\nAdd this to your .env.local file:\n");
console.log(`ACCESS_PASSWORD_HASH=${combined}`);
console.log(`COOKIE_SECRET=${randomBytes(32).toString("hex")}`);
console.log("");
