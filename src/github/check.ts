import { GitClient } from "../git/client.js";
import { GitHubClient } from "./client.js";
import { resolveGitHubToken } from "./auth.js";

/**
 * Verify GitHub API connectivity and display connection info.
 */
export async function checkGitHubConnection(
  repoPath: string,
  githubUrl?: string,
): Promise<void> {
  const gitClient = new GitClient(repoPath);

  if (!(await gitClient.isRepo())) {
    console.error("Error: Not a git repository.");
    process.exit(1);
  }

  // 1. Check remote URL
  const remoteUrl = await gitClient.getRemoteUrl();
  if (!remoteUrl) {
    console.error("Error: No git remote found.");
    process.exit(1);
  }
  console.log(`Remote URL:   ${remoteUrl}`);

  // 2. Parse remote to get hostname / owner / repo
  const parsed = GitHubClient.parseRemoteUrl(remoteUrl, githubUrl);
  if (!parsed) {
    console.error("Error: Could not parse remote URL as a GitHub repository.");
    process.exit(1);
  }
  console.log(`Hostname:     ${parsed.hostname}`);
  console.log(`Repository:   ${parsed.owner}/${parsed.repo}`);
  console.log(`API Base URL: ${parsed.apiBaseUrl}`);

  // 3. Resolve token
  console.log(`\nResolving token for hostname: ${parsed.hostname}`);
  const token = resolveGitHubToken(parsed.hostname);
  if (!token) {
    console.error(
      `No GitHub token found.\n` +
        `Tried:\n` +
        `  1. Environment variables: GITHUB_TOKEN, GH_TOKEN\n` +
        `  2. gh auth token --hostname ${parsed.hostname}\n` +
        (parsed.hostname !== "github.com"
          ? `  3. gh auth token (default host fallback)\n`
          : "") +
        `\nPlease run: gh auth login` +
        (parsed.hostname !== "github.com"
          ? ` --hostname ${parsed.hostname}`
          : ""),
    );
    process.exit(1);
  }
  console.log(`Token:        ****${token.slice(-4)}`);

  // 4. Verify API connectivity
  console.log("\nVerifying API connectivity...");
  try {
    const client = new GitHubClient(token, parsed.apiBaseUrl);
    const user = await client.verifyConnection();
    console.log(
      `Authenticated as: ${user.login}${user.name ? ` (${user.name})` : ""}`,
    );
    console.log("\nGitHub connection OK.");
  } catch (error: any) {
    console.error(`\nAPI connection failed: ${error.message}`);
    process.exit(1);
  }
}
