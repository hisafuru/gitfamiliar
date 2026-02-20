export type ScoringMode =
  | "binary"
  | "authorship"
  | "review-coverage"
  | "weighted";
export type FilterMode = "all" | "written" | "reviewed";
export type ExpirationPolicyType = "never" | "time" | "change" | "combined";

export interface ExpirationConfig {
  policy: ExpirationPolicyType;
  duration?: number; // days
  threshold?: number; // 0-1 (e.g., 0.5 for 50%)
}

export interface WeightConfig {
  blame: number; // default 0.5
  commit: number; // default 0.35
  review: number; // default 0.15
}

export interface CliOptions {
  mode: ScoringMode;
  user?: string;
  filter: FilterMode;
  expiration: ExpirationConfig;
  html: boolean;
  weights: WeightConfig;
  repoPath: string;
}

export interface UserIdentity {
  name: string;
  email: string;
}

export interface FileScore {
  type: "file";
  path: string;
  lines: number;
  score: number;
  isWritten?: boolean;
  isReviewed?: boolean;
  blameScore?: number;
  commitScore?: number;
  reviewScore?: number;
  isExpired?: boolean;
  lastTouchDate?: Date;
}

export interface FolderScore {
  type: "folder";
  path: string;
  lines: number;
  score: number;
  fileCount: number;
  readCount?: number;
  children: TreeNode[];
}

export type TreeNode = FileScore | FolderScore;

export interface CommitInfo {
  hash: string;
  date: Date;
  addedLines: number;
  deletedLines: number;
  fileSizeAtCommit: number;
}

export interface ReviewInfo {
  date: Date;
  type: "approved" | "commented" | "changes_requested";
  filesInPR: number;
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  blame: 0.5,
  commit: 0.35,
  review: 0.15,
};

export const DEFAULT_EXPIRATION: ExpirationConfig = {
  policy: "never",
};
