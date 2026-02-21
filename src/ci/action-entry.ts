/**
 * GitHub Action entry point.
 * This file is bundled into .github/actions/gitfamiliar/dist/index.js
 */
import * as core from "@actions/core";
import * as github from "@actions/github";
import type { ScoringMode } from "../core/types.js";
import { analyzePR } from "./pr-analyzer.js";
import { formatPRComment } from "./comment-formatter.js";

const COMMENT_MARKER = "<!-- gitfamiliar-pr-analysis -->";

async function run(): Promise<void> {
  try {
    const token = core.getInput("github-token", { required: true });
    const threshold = parseInt(core.getInput("familiarity-threshold") || "30", 10);
    const reviewerCount = parseInt(core.getInput("suggest-reviewers") || "3", 10);
    const mode = (core.getInput("mode") || "binary") as ScoringMode;

    const context = github.context;
    const pr = context.payload.pull_request;

    if (!pr) {
      throw new Error(
        "This action must be triggered by a pull_request event.",
      );
    }

    const prNumber = pr.number;
    const prAuthor = pr.user?.login || "";
    const octokit = github.getOctokit(token);

    // Get changed files from PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
      per_page: 300,
    });

    const changedFiles = files.map((f) => f.filename);

    if (changedFiles.length === 0) {
      core.info("No changed files in PR, skipping analysis.");
      return;
    }

    core.info(`Analyzing ${changedFiles.length} changed files for PR #${prNumber}`);

    // Run analysis
    const result = await analyzePR(
      process.cwd(),
      prNumber,
      changedFiles,
      prAuthor,
      mode,
      threshold,
      reviewerCount,
    );

    // Format comment
    const comment = COMMENT_MARKER + "\n" + formatPRComment(result, threshold);

    // Find existing comment to update
    const { data: comments } = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      per_page: 100,
    });

    const existingComment = comments.find(
      (c) => c.body?.includes(COMMENT_MARKER),
    );

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: comment,
      });
      core.info("Updated existing PR comment.");
    } else {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: comment,
      });
      core.info("Posted new PR comment.");
    }

    // Set outputs
    core.setOutput("risk-level", result.riskLevel);
    core.setOutput("unfamiliar-count", result.unfamiliarFiles.length.toString());
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
