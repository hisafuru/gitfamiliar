import { execSync } from 'node:child_process';

/**
 * Resolve GitHub token from environment or gh CLI.
 */
export function resolveGitHubToken(): string | null {
  // Check environment variables
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  // Try gh CLI
  try {
    const token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (token) return token;
  } catch {
    // gh CLI not available or not authenticated
  }

  return null;
}
