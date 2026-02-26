import type { GitClient } from "../git/client.js";
import type { FileFilter } from "../filter/ignore.js";
import type { FolderScore, FileScore, TreeNode } from "./types.js";
import { countLines } from "../utils/line-count.js";

/**
 * Build a hierarchical file tree from git-tracked files.
 */
export async function buildFileTree(
  gitClient: GitClient,
  filter: FileFilter,
): Promise<FolderScore> {
  const repoRoot = await gitClient.getRepoRoot();
  const allFiles = await gitClient.listFiles();
  const filteredFiles = allFiles.filter(filter);

  // Build flat file scores
  const fileScores: FileScore[] = filteredFiles.map((filePath) => ({
    type: "file" as const,
    path: filePath,
    lines: countLines(repoRoot, filePath),
    score: 0,
  }));

  // Build tree structure
  return buildTreeFromFiles(fileScores);
}

function buildTreeFromFiles(files: FileScore[]): FolderScore {
  const root: FolderScore = {
    type: "folder",
    path: "",
    lines: 0,
    score: 0,
    fileCount: 0,
    children: [],
  };

  // Group files by directory path
  const folderMap = new Map<string, FolderScore>();
  folderMap.set("", root);

  for (const file of files) {
    const parts = file.path.split("/");
    let currentPath = "";

    // Ensure all ancestor folders exist
    for (let i = 0; i < parts.length - 1; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!folderMap.has(currentPath)) {
        const folder: FolderScore = {
          type: "folder",
          path: currentPath,
          lines: 0,
          score: 0,
          fileCount: 0,
          children: [],
        };
        folderMap.set(currentPath, folder);

        // Add to parent
        const parent = folderMap.get(parentPath)!;
        parent.children.push(folder);
      }
    }

    // Add file to its parent folder
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    const parent = folderMap.get(parentPath)!;
    parent.children.push(file);
  }

  // Calculate aggregate line counts and file counts
  computeAggregates(root);

  return root;
}

function computeAggregates(node: FolderScore): void {
  let totalLines = 0;
  let totalFiles = 0;

  for (const child of node.children) {
    if (child.type === "file") {
      totalLines += child.lines;
      totalFiles += 1;
    } else {
      computeAggregates(child);
      totalLines += child.lines;
      totalFiles += child.fileCount;
    }
  }

  node.lines = totalLines;
  node.fileCount = totalFiles;
}

/**
 * Walk all files in a tree, calling the visitor on each FileScore.
 */
export function walkFiles(
  node: TreeNode,
  visitor: (file: FileScore) => void,
): void {
  if (node.type === "file") {
    visitor(node);
  } else {
    for (const child of node.children) {
      walkFiles(child, visitor);
    }
  }
}

/**
 * Recompute folder scores after file scores have been updated.
 * For binary mode: score = readCount / fileCount
 * For other modes: score = weighted average by line count
 */
export function recomputeFolderScores(
  node: FolderScore,
  mode: "committed" | "continuous",
): void {
  let readCount = 0;
  let totalFiles = 0;
  let weightedScore = 0;
  let totalLines = 0;

  for (const child of node.children) {
    if (child.type === "file") {
      totalFiles += 1;
      totalLines += child.lines;
      weightedScore += child.score * child.lines;
      if (child.score > 0) readCount += 1;
    } else {
      recomputeFolderScores(child, mode);
      totalFiles += child.fileCount;
      totalLines += child.lines;
      weightedScore += child.score * child.lines;
      readCount += child.readCount || 0;
    }
  }

  node.fileCount = totalFiles;
  node.readCount = readCount;

  if (mode === "committed") {
    node.score = totalFiles > 0 ? readCount / totalFiles : 0;
  } else {
    node.score = totalLines > 0 ? weightedScore / totalLines : 0;
  }
}
