import { Command } from "commander";
import { parseOptions } from "./options.js";
import { computeFamiliarity } from "../core/familiarity.js";
import { renderTerminal } from "./output/terminal.js";
import { generateAndOpenHTML } from "./output/html.js";
import { computeTeamCoverage } from "../core/team-coverage.js";
import { renderCoverageTerminal } from "./output/coverage-terminal.js";
import { generateAndOpenCoverageHTML } from "./output/coverage-html.js";
import { computeMultiUser } from "../core/multi-user.js";
import { renderMultiUserTerminal } from "./output/multi-user-terminal.js";
import { generateAndOpenMultiUserHTML } from "./output/multi-user-html.js";
import { computeHotspots } from "../core/hotspot.js";
import { renderHotspotTerminal } from "./output/hotspot-terminal.js";
import { generateAndOpenHotspotHTML } from "./output/hotspot-html.js";
import { checkGitHubConnection } from "../github/check.js";

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("gitfamiliar")
    .description("Visualize your code familiarity from Git history")
    .version("0.1.1")
    .option(
      "-m, --mode <mode>",
      "Scoring mode: binary, authorship, review-coverage, weighted",
      "binary",
    )
    .option(
      "-u, --user <user>",
      "Git user name or email (repeatable for comparison)",
      collect,
      [],
    )
    .option(
      "-f, --filter <filter>",
      "Filter mode: all, written, reviewed",
      "all",
    )
    .option(
      "-e, --expiration <policy>",
      "Expiration policy: never, time:180d, change:50%, combined:365d:50%",
      "never",
    )
    .option("--html", "Generate HTML treemap report", false)
    .option(
      "-w, --weights <weights>",
      'Weights for weighted mode: blame,commit,review (e.g., "0.5,0.35,0.15")',
    )
    .option("--team", "Compare all contributors", false)
    .option(
      "--team-coverage",
      "Show team coverage map (bus factor analysis)",
      false,
    )
    .option("--hotspot [mode]", "Hotspot analysis: personal (default) or team")
    .option(
      "--window <days>",
      "Time window for hotspot analysis in days (default: 90)",
    )
    .option(
      "--github-url <hostname>",
      "GitHub Enterprise hostname (e.g. ghe.example.com). Auto-detected from git remote if omitted.",
    )
    .option(
      "--check-github",
      "Verify GitHub API connectivity and show connection info",
      false,
    )
    .action(async (rawOptions) => {
      try {
        const repoPath = process.cwd();
        const options = parseOptions(rawOptions, repoPath);

        // Route: check GitHub connectivity
        if (options.checkGithub) {
          await checkGitHubConnection(repoPath, options.githubUrl);
          return;
        }

        // Route: hotspot analysis
        if (options.hotspot) {
          const result = await computeHotspots(options);
          if (options.html) {
            await generateAndOpenHotspotHTML(result, repoPath);
          } else {
            renderHotspotTerminal(result);
          }
          return;
        }

        // Route: team coverage
        if (options.teamCoverage) {
          const result = await computeTeamCoverage(options);
          if (options.html) {
            await generateAndOpenCoverageHTML(result, repoPath);
          } else {
            renderCoverageTerminal(result);
          }
          return;
        }

        // Route: multi-user comparison
        const isMultiUser =
          options.team ||
          (Array.isArray(options.user) && options.user.length > 1);
        if (isMultiUser) {
          const result = await computeMultiUser(options);
          if (options.html) {
            await generateAndOpenMultiUserHTML(result, repoPath);
          } else {
            renderMultiUserTerminal(result);
          }
          return;
        }

        // Route: single user (existing flow)
        const result = await computeFamiliarity(options);

        // Block review-dependent modes/filters when no review data
        if (!result.hasReviewData) {
          if (options.mode === "review-coverage") {
            console.error(
              "Error: --mode review-coverage requires review data, but none was available.\n" +
                "  Ensure you have a GitHub token (gh auth login) and have reviewed PRs in this repo.",
            );
            process.exit(1);
          }
          if (options.filter === "reviewed") {
            console.error(
              "Error: --filter reviewed requires review data, but none was available.\n" +
                "  Ensure you have a GitHub token (gh auth login) and have reviewed PRs in this repo.",
            );
            process.exit(1);
          }
        }

        if (options.html) {
          await generateAndOpenHTML(result, repoPath);
        } else {
          renderTerminal(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  return program;
}
