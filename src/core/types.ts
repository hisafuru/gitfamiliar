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

export type HotspotMode = "personal" | "team";
export type HotspotRiskLevel = "critical" | "high" | "medium" | "low";

export interface CliOptions {
  mode: ScoringMode;
  user?: string | string[];
  filter: FilterMode;
  expiration: ExpirationConfig;
  html: boolean;
  weights: WeightConfig;
  repoPath: string;
  team?: boolean;
  teamCoverage?: boolean;
  hotspot?: HotspotMode;
  window?: number; // days for hotspot analysis
  githubUrl?: string; // GitHub Enterprise hostname override
  checkGithub?: boolean; // verify GitHub connectivity
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

// ── Multi-User Comparison Types ──

export type RiskLevel = "safe" | "moderate" | "risk";

export interface UserScore {
  user: UserIdentity;
  score: number;
  isWritten?: boolean;
  isReviewed?: boolean;
}

export interface MultiUserFileScore {
  type: "file";
  path: string;
  lines: number;
  score: number;
  userScores: UserScore[];
}

export interface MultiUserFolderScore {
  type: "folder";
  path: string;
  lines: number;
  score: number;
  fileCount: number;
  userScores: UserScore[];
  children: MultiUserTreeNode[];
}

export type MultiUserTreeNode = MultiUserFileScore | MultiUserFolderScore;

export interface UserSummary {
  user: UserIdentity;
  writtenCount: number;
  reviewedCount: number;
  overallScore: number;
}

export interface MultiUserResult {
  tree: MultiUserFolderScore;
  repoName: string;
  users: UserIdentity[];
  mode: string;
  totalFiles: number;
  userSummaries: UserSummary[];
}

// ── Team Coverage Types ──

export interface CoverageFileScore {
  type: "file";
  path: string;
  lines: number;
  contributorCount: number;
  contributors: string[];
  riskLevel: RiskLevel;
}

export interface CoverageFolderScore {
  type: "folder";
  path: string;
  lines: number;
  fileCount: number;
  avgContributors: number;
  busFactor: number;
  riskLevel: RiskLevel;
  children: CoverageTreeNode[];
}

export type CoverageTreeNode = CoverageFileScore | CoverageFolderScore;

export interface TeamCoverageResult {
  tree: CoverageFolderScore;
  repoName: string;
  totalContributors: number;
  totalFiles: number;
  riskFiles: CoverageFileScore[];
  overallBusFactor: number;
}

// ── CI / PR Analysis Types ──

export interface ReviewerSuggestion {
  user: UserIdentity;
  relevantFiles: string[];
  avgFamiliarity: number;
}

export interface PRAnalysisResult {
  prNumber: number;
  author: string;
  changedFiles: string[];
  familiarityScores: Map<string, number>;
  unfamiliarFiles: string[];
  suggestedReviewers: ReviewerSuggestion[];
  riskLevel: RiskLevel;
}

// ── Hotspot Analysis Types ──

export interface HotspotFileScore {
  path: string;
  lines: number;
  familiarity: number;
  changeFrequency: number;
  lastChanged: Date | null;
  risk: number;
  riskLevel: HotspotRiskLevel;
}

export interface HotspotResult {
  files: HotspotFileScore[];
  repoName: string;
  userName?: string;
  hotspotMode: HotspotMode;
  timeWindow: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
