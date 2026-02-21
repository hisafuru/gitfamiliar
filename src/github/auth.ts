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

  // Try gh CLI (always pass --hostname for explicit host resolution)
  try {
    const host = hostname || "github.com";
    const token = execSync(`gh auth token --hostname ${host}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (token) return token;
  } catch {
    // gh CLI not available or not authenticated for this hostname
  }

  // Fallback: try gh auth token without --hostname (uses default host)
  if (hostname && hostname !== "github.com") {
    try {
      const token = execSync("gh auth token", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (token) return token;
    } catch {
      // gh CLI not available or not authenticated
    }
  }

  return null;
}
