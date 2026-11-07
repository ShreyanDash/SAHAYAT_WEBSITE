import { execFileSync } from "node:child_process";

const patterns = [
  "AIza[0-9A-Za-z_-]{20,}",
  "AKIA[0-9A-Z]{16}",
  "sk-[A-Za-z0-9_-]{16,}",
  "-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----",
  "GMAIL_APP_PASSWORD=",
  "MANUS_API_KEY=",
  "DATABASE_URL=",
];

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter(file => !file.endsWith("pnpm-lock.yaml"));

const matches = [];
for (const pattern of patterns) {
  try {
    const output = execFileSync("git", ["grep", "-I", "-n", "-E", "-e", pattern, "--", ...tracked], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (output.trim()) matches.push(output.trim());
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (matches.length > 0) {
  console.error("Potential credential literals found in tracked text files:");
  console.error(matches.join("\n"));
  process.exit(1);
}

console.log(`Security audit passed: scanned ${tracked.length} tracked files and found no credential literals.`);
