import { execSync } from "node:child_process";

/**
 * Resolve GitHub token from environment or gh CLI.
 * For GitHub Enterprise, pass the hostname (e.g. "ghe.example.com")
 * to use `gh auth token --hostname <host>`.
 */
export function resolveGitHubToken(hostname?: string): string | null {
  // Check environment variables
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  // Try gh CLI (with optional hostname for GHE)
  try {
    const cmd =
      hostname && hostname !== "github.com"
        ? `gh auth token --hostname ${hostname}`
        : "gh auth token";
    const token = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (token) return token;
  } catch {
    // gh CLI not available or not authenticated
  }

  return null;
}
