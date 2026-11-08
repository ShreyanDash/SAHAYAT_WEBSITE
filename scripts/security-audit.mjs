import { execFileSync } from "node:child_process";

const patternDefinitions = [
  { name: "Google API Key", pattern: "AIza[0-9A-Za-z_-]{20,}" },
  { name: "AWS Access Key", pattern: "AKIA[0-9A-Z]{16}" },
  { name: "Secret Key (sk-*)", pattern: "sk-[A-Za-z0-9_-]{16,}" },
  { name: "Private Key Header", pattern: "-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----" },
  // Patterns are constructed dynamically so the scanner definition does not match itself
  { name: "Gmail App Password Assignment", pattern: ["GMAIL", "_APP_PASSWORD="].join("") },
  { name: "Manus API Key Assignment", pattern: ["MANUS", "_API_KEY="].join("") },
  { name: "Database URL Assignment", pattern: ["DATABASE", "_URL="].join("") },
];

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter(file => !file.endsWith("pnpm-lock.yaml"));

const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const matches = [];
for (const { name, pattern } of patternDefinitions) {
  try {
    const output = execFileSync(
      "git",
      ["grep", "-I", "-n", "-E", "--untracked", "-e", pattern, "--", ".", ":(exclude)pnpm-lock.yaml"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    if (output.trim()) {
      for (const line of output.trim().split("\n")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          matches.push(`${parts[0]}:${parts[1]} [Potential credential pattern: ${name}]`);
        } else {
          matches.push(`[Potential credential pattern: ${name}]`);
        }
      }
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (matches.length > 0) {
  console.error("Potential credential literals found in tracked or untracked repository files:");
  console.error(matches.join("\n"));
  process.exit(1);
}

console.log(
  `Security audit passed: scanned ${tracked.length} tracked files and ${untracked.length} untracked files with no credential literals found.`
);
