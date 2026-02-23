export type ScoringMode = "binary" | "authorship" | "weighted";
export type ExpirationPolicyType = "never" | "time" | "change" | "combined";

export interface ExpirationConfig {
  policy: ExpirationPolicyType;
  duration?: number; // days
  threshold?: number; // 0-1 (e.g., 0.5 for 50%)
}

export interface WeightConfig {
  blame: number; // default 0.5
  commit: number; // default 0.5
}

export type HotspotMode = "personal" | "team";
export type HotspotRiskLevel = "critical" | "high" | "medium" | "low";

export interface CliOptions {
  mode: ScoringMode;
  user?: string | string[];
  expiration: ExpirationConfig;
  html: boolean;
  weights: WeightConfig;
  repoPath: string;
  team?: boolean;
  teamCoverage?: boolean;
  hotspot?: HotspotMode;
  window?: number; // days for hotspot analysis
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
  blameScore?: number;
  commitScore?: number;
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

export const DEFAULT_WEIGHTS: WeightConfig = {
  blame: 0.5,
  commit: 0.5,
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

// ── Unified Dashboard Types ──

export interface UnifiedData {
  repoName: string;
  userName: string;
  scoring: {
    binary: FamiliarityResult;
    authorship: FamiliarityResult;
    weighted: FamiliarityResult;
  };
  coverage: TeamCoverageResult;
  hotspot: HotspotResult;
  hotspotTeamFamiliarity: Record<string, number>;
  multiUser: MultiUserResult;
}

export interface FamiliarityResult {
  tree: FolderScore;
  repoName: string;
  userName: string;
  mode: string;
  writtenCount: number;
  totalFiles: number;
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
