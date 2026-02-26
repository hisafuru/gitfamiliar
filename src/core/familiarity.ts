import type { CliOptions, FolderScore, FamiliarityResult } from "./types.js";
import { GitClient } from "../git/client.js";
import { resolveUser } from "../git/identity.js";
import { createFilter } from "../filter/ignore.js";
import { buildFileTree, walkFiles } from "./file-tree.js";
import { getFilesCommittedByUser } from "../git/log.js";
import { scoreCommitted } from "../scoring/committed.js";
import { scoreCodeCoverage } from "../scoring/code-coverage.js";
import { scoreWeighted } from "../scoring/weighted.js";
import { getExpiredFiles } from "../scoring/expiration.js";

export type { FamiliarityResult };

export async function computeFamiliarity(
  options: CliOptions,
): Promise<FamiliarityResult> {
  const gitClient = new GitClient(options.repoPath);

  if (!(await gitClient.isRepo())) {
    throw new Error(`"${options.repoPath}" is not a git repository.`);
  }

  const repoRoot = await gitClient.getRepoRoot();
  const repoName = await gitClient.getRepoName();
  const userFlag = Array.isArray(options.user) ? options.user[0] : options.user;
  const user = await resolveUser(gitClient, userFlag);
  const filter = createFilter(repoRoot);
  const tree = await buildFileTree(gitClient, filter);

  // Get written files (used by binary, weighted)
  const writtenFiles = await getFilesCommittedByUser(gitClient, user);

  // Get expired files
  let expiredFiles: Set<string> | undefined;
  if (options.expiration.policy !== "never") {
    const allFiles: string[] = [];
    walkFiles(tree, (f) => allFiles.push(f.path));
    expiredFiles = await getExpiredFiles(
      gitClient,
      allFiles,
      user,
      options.expiration,
    );
  }

  // Score based on mode
  switch (options.mode) {
    case "committed":
      scoreCommitted(tree, writtenFiles, expiredFiles);
      break;

    case "code-coverage":
      await scoreCodeCoverage(tree, gitClient, user);
      break;

    case "weighted":
      await scoreWeighted(tree, gitClient, user, options.weights);
      break;
  }

  return {
    tree,
    repoName,
    userName: user.name || user.email,
    mode: options.mode,
    writtenCount: countWritten(tree, writtenFiles),
    totalFiles: tree.fileCount,
  };
}

function countWritten(tree: FolderScore, writtenFiles: Set<string>): number {
  let count = 0;
  walkFiles(tree, (file) => {
    if (writtenFiles.has(file.path)) count++;
  });
  return count;
}
