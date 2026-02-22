import { createRequire } from "node:module";
import { Command } from "commander";
import { parseOptions } from "./options.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");
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
import { computeUnified } from "../core/unified.js";
import { generateAndOpenUnifiedHTML } from "./output/unified-html.js";

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("gitfamiliar")
    .description("Visualize your code familiarity from Git history")
    .version(pkg.version)
    .option(
      "-m, --mode <mode>",
      "Scoring mode: binary, authorship, weighted",
      "binary",
    )
    .option(
      "-u, --user <user>",
      "Git user name or email (repeatable for comparison)",
      collect,
      [],
    )
    .option(
      "-e, --expiration <policy>",
      "Expiration policy: never, time:180d, change:50%, combined:365d:50%",
      "never",
    )
    .option("--html", "Generate HTML treemap report", false)
    .option(
      "-w, --weights <weights>",
      'Weights for weighted mode: blame,commit (e.g., "0.5,0.5")',
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
    .action(async (rawOptions) => {
      try {
        const repoPath = process.cwd();
        const options = parseOptions(rawOptions, repoPath);

        // Route: unified HTML dashboard (--html without specific feature flags)
        const isMultiUserCheck =
          options.team ||
          (Array.isArray(options.user) && options.user.length > 1);
        if (
          options.html &&
          !options.hotspot &&
          !options.teamCoverage &&
          !isMultiUserCheck
        ) {
          const data = await computeUnified(options);
          await generateAndOpenUnifiedHTML(data, repoPath);
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
