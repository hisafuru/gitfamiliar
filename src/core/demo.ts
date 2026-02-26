import type {
  ScoringMode,
  FamiliarityResult,
  FolderScore,
  FileScore,
  TreeNode,
  HotspotResult,
  HotspotFileScore,
  HotspotRiskLevel,
  TeamCoverageResult,
  CoverageFolderScore,
  CoverageFileScore,
  CoverageTreeNode,
  RiskLevel,
  MultiUserResult,
  MultiUserFolderScore,
  MultiUserFileScore,
  MultiUserTreeNode,
  UserIdentity,
  UserScore,
  UserSummary,
  UnifiedData,
} from "./types.js";

// ── Constants ──

const REPO_NAME = "acme-web-app";

const ALICE: UserIdentity = { name: "Alice Chen", email: "alice@acme.dev" };
const BOB: UserIdentity = { name: "Bob Kim", email: "bob@acme.dev" };
const CHARLIE: UserIdentity = {
  name: "Charlie Rivera",
  email: "charlie@acme.dev",
};
const DIANA: UserIdentity = { name: "Diana Patel", email: "diana@acme.dev" };

const USERS = [ALICE, BOB, CHARLIE, DIANA];

// ── Demo file definitions ──

interface DemoFile {
  path: string;
  lines: number;
  familiarity: { alice: number; bob: number; charlie: number; diana: number };
  written: { alice: boolean; bob: boolean; charlie: boolean; diana: boolean };
  contributors: string[];
  changeFrequency: number;
  lastChanged: string | null; // ISO date string
}

const DEMO_FILES: DemoFile[] = [
  // Root config files
  {
    path: "package.json",
    lines: 25,
    familiarity: { alice: 0.6, bob: 0.2, charlie: 0.3, diana: 0.8 },
    written: { alice: true, bob: false, charlie: false, diana: true },
    contributors: ["Alice Chen", "Diana Patel"],
    changeFrequency: 1,
    lastChanged: "2026-02-01",
  },
  {
    path: "tsconfig.json",
    lines: 15,
    familiarity: { alice: 0.55, bob: 0.1, charlie: 0.25, diana: 0.75 },
    written: { alice: true, bob: false, charlie: false, diana: true },
    contributors: ["Alice Chen", "Diana Patel"],
    changeFrequency: 0,
    lastChanged: null,
  },
  {
    path: "README.md",
    lines: 80,
    familiarity: { alice: 0.4, bob: 0.3, charlie: 0.25, diana: 0.2 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim", "Charlie Rivera"],
    changeFrequency: 1,
    lastChanged: "2026-02-10",
  },
  {
    path: "Dockerfile",
    lines: 35,
    familiarity: { alice: 0.3, bob: 0.0, charlie: 0.0, diana: 0.9 },
    written: { alice: false, bob: false, charlie: false, diana: true },
    contributors: ["Diana Patel"],
    changeFrequency: 2,
    lastChanged: "2026-02-20",
  },

  // CI/CD
  {
    path: ".github/workflows/ci.yml",
    lines: 65,
    familiarity: { alice: 0.15, bob: 0.0, charlie: 0.0, diana: 0.95 },
    written: { alice: false, bob: false, charlie: false, diana: true },
    contributors: ["Diana Patel"],
    changeFrequency: 3,
    lastChanged: "2026-02-18",
  },
  {
    path: ".github/workflows/deploy.yml",
    lines: 45,
    familiarity: { alice: 0.1, bob: 0.0, charlie: 0.0, diana: 0.9 },
    written: { alice: false, bob: false, charlie: false, diana: true },
    contributors: ["Diana Patel"],
    changeFrequency: 2,
    lastChanged: "2026-02-15",
  },

  // src/ core
  {
    path: "src/index.ts",
    lines: 30,
    familiarity: { alice: 0.85, bob: 0.25, charlie: 0.1, diana: 0.4 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim"],
    changeFrequency: 1,
    lastChanged: "2026-01-20",
  },
  {
    path: "src/config.ts",
    lines: 55,
    familiarity: { alice: 0.75, bob: 0.15, charlie: 0.2, diana: 0.6 },
    written: { alice: true, bob: true, charlie: true, diana: true },
    contributors: ["Alice Chen", "Bob Kim", "Charlie Rivera", "Diana Patel"],
    changeFrequency: 3,
    lastChanged: "2026-02-22",
  },
  {
    path: "src/app.ts",
    lines: 120,
    familiarity: { alice: 0.9, bob: 0.1, charlie: 0.1, diana: 0.45 },
    written: { alice: true, bob: false, charlie: false, diana: true },
    contributors: ["Alice Chen", "Diana Patel"],
    changeFrequency: 2,
    lastChanged: "2026-02-05",
  },

  // src/routes
  {
    path: "src/routes/auth.ts",
    lines: 95,
    familiarity: { alice: 0.9, bob: 0.0, charlie: 0.0, diana: 0.1 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 3,
    lastChanged: "2026-02-12",
  },
  {
    path: "src/routes/users.ts",
    lines: 130,
    familiarity: { alice: 0.85, bob: 0.2, charlie: 0.0, diana: 0.1 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim"],
    changeFrequency: 3,
    lastChanged: "2026-02-14",
  },
  {
    path: "src/routes/products.ts",
    lines: 180,
    familiarity: { alice: 0.8, bob: 0.15, charlie: 0.0, diana: 0.05 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim"],
    changeFrequency: 4,
    lastChanged: "2026-02-19",
  },
  {
    path: "src/routes/orders.ts",
    lines: 210,
    familiarity: { alice: 0.25, bob: 0.0, charlie: 0.0, diana: 0.05 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 12,
    lastChanged: "2026-02-25",
  },

  // src/middleware
  {
    path: "src/middleware/auth.ts",
    lines: 75,
    familiarity: { alice: 0.85, bob: 0.0, charlie: 0.0, diana: 0.15 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 1,
    lastChanged: "2026-01-15",
  },
  {
    path: "src/middleware/logging.ts",
    lines: 50,
    familiarity: { alice: 0.8, bob: 0.0, charlie: 0.0, diana: 0.5 },
    written: { alice: true, bob: false, charlie: false, diana: true },
    contributors: ["Alice Chen", "Diana Patel"],
    changeFrequency: 1,
    lastChanged: "2026-01-25",
  },
  {
    path: "src/middleware/error-handler.ts",
    lines: 60,
    familiarity: { alice: 0.4, bob: 0.0, charlie: 0.0, diana: 0.2 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 6,
    lastChanged: "2026-02-23",
  },

  // src/models
  {
    path: "src/models/user.ts",
    lines: 85,
    familiarity: { alice: 0.88, bob: 0.2, charlie: 0.0, diana: 0.1 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim"],
    changeFrequency: 2,
    lastChanged: "2026-02-08",
  },
  {
    path: "src/models/product.ts",
    lines: 90,
    familiarity: { alice: 0.85, bob: 0.0, charlie: 0.0, diana: 0.05 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 1,
    lastChanged: "2026-01-10",
  },
  {
    path: "src/models/order.ts",
    lines: 110,
    familiarity: { alice: 0.7, bob: 0.0, charlie: 0.0, diana: 0.05 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 5,
    lastChanged: "2026-02-21",
  },

  // src/services
  {
    path: "src/services/email.ts",
    lines: 70,
    familiarity: { alice: 0.8, bob: 0.0, charlie: 0.0, diana: 0.15 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 1,
    lastChanged: "2026-01-05",
  },
  {
    path: "src/services/payment.ts",
    lines: 150,
    familiarity: { alice: 0.5, bob: 0.0, charlie: 0.0, diana: 0.35 },
    written: { alice: true, bob: false, charlie: false, diana: true },
    contributors: ["Alice Chen", "Diana Patel"],
    changeFrequency: 9,
    lastChanged: "2026-02-24",
  },
  {
    path: "src/services/inventory.ts",
    lines: 95,
    familiarity: { alice: 0.55, bob: 0.0, charlie: 0.0, diana: 0.1 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 5,
    lastChanged: "2026-02-17",
  },

  // src/utils
  {
    path: "src/utils/validators.ts",
    lines: 65,
    familiarity: { alice: 0.85, bob: 0.15, charlie: 0.1, diana: 0.2 },
    written: { alice: true, bob: true, charlie: false, diana: false },
    contributors: ["Alice Chen", "Bob Kim"],
    changeFrequency: 1,
    lastChanged: "2026-01-30",
  },
  {
    path: "src/utils/helpers.ts",
    lines: 45,
    familiarity: { alice: 0.8, bob: 0.0, charlie: 0.05, diana: 0.1 },
    written: { alice: true, bob: false, charlie: false, diana: false },
    contributors: ["Alice Chen"],
    changeFrequency: 0,
    lastChanged: null,
  },

  // frontend
  {
    path: "frontend/App.tsx",
    lines: 140,
    familiarity: { alice: 0.15, bob: 0.0, charlie: 0.85, diana: 0.05 },
    written: { alice: true, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera", "Alice Chen"],
    changeFrequency: 7,
    lastChanged: "2026-02-24",
  },
  {
    path: "frontend/index.tsx",
    lines: 20,
    familiarity: { alice: 0.1, bob: 0.0, charlie: 0.8, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 1,
    lastChanged: "2026-01-12",
  },
  {
    path: "frontend/components/Header.tsx",
    lines: 85,
    familiarity: { alice: 0.1, bob: 0.0, charlie: 0.9, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 2,
    lastChanged: "2026-02-03",
  },
  {
    path: "frontend/components/ProductList.tsx",
    lines: 160,
    familiarity: { alice: 0.1, bob: 0.0, charlie: 0.85, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 4,
    lastChanged: "2026-02-16",
  },
  {
    path: "frontend/components/Cart.tsx",
    lines: 190,
    familiarity: { alice: 0.08, bob: 0.0, charlie: 0.92, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 8,
    lastChanged: "2026-02-22",
  },
  {
    path: "frontend/components/Checkout.tsx",
    lines: 220,
    familiarity: { alice: 0.05, bob: 0.0, charlie: 0.95, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 10,
    lastChanged: "2026-02-25",
  },
  {
    path: "frontend/styles/global.css",
    lines: 120,
    familiarity: { alice: 0.05, bob: 0.0, charlie: 0.9, diana: 0.0 },
    written: { alice: false, bob: false, charlie: true, diana: false },
    contributors: ["Charlie Rivera"],
    changeFrequency: 2,
    lastChanged: "2026-02-11",
  },
];

// ── Tree building helpers ──

function groupByDirectory(
  files: { path: string }[],
): Map<string, { path: string }[]> {
  const groups = new Map<string, { path: string }[]>();
  for (const file of files) {
    const lastSlash = file.path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? file.path.substring(0, lastSlash) : "";
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(file);
  }
  return groups;
}

function buildScoringTree(
  files: FileScore[],
  mode: ScoringMode,
): FolderScore {
  // Build directory structure
  const allDirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join("/"));
    }
  }

  // Build leaf-to-root: first create file nodes by directory, then folders
  const dirChildren = new Map<string, TreeNode[]>();

  // Add files to their parent directories
  for (const f of files) {
    const lastSlash = f.path.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? f.path.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(f);
  }

  // Sort directories deepest first
  const sortedDirs = [...allDirs].sort(
    (a, b) => b.split("/").length - a.split("/").length,
  );

  // Build folder nodes bottom-up
  const folderNodes = new Map<string, FolderScore>();
  for (const dir of sortedDirs) {
    const children = dirChildren.get(dir) || [];
    let totalLines = 0;
    let weightedScore = 0;
    let fileCount = 0;
    let readCount = 0;

    for (const child of children) {
      totalLines += child.lines;
      weightedScore += child.lines * child.score;
      if (child.type === "file") {
        fileCount++;
        if (child.score > 0) readCount++;
      } else {
        fileCount += (child as FolderScore).fileCount;
        readCount += (child as FolderScore).readCount || 0;
      }
    }

    const folder: FolderScore = {
      type: "folder",
      path: dir,
      lines: totalLines,
      score: totalLines > 0 ? weightedScore / totalLines : 0,
      fileCount,
      children: children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.path.localeCompare(b.path);
      }),
    };
    if (mode === "committed") folder.readCount = readCount;

    folderNodes.set(dir, folder);

    // Add this folder to its parent
    const lastSlash = dir.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? dir.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(folder);
  }

  // Build root
  const rootChildren = dirChildren.get("") || [];
  let totalLines = 0;
  let weightedScore = 0;
  let fileCount = 0;
  let readCount = 0;

  for (const child of rootChildren) {
    totalLines += child.lines;
    weightedScore += child.lines * child.score;
    if (child.type === "file") {
      fileCount++;
      if (child.score > 0) readCount++;
    } else {
      fileCount += (child as FolderScore).fileCount;
      readCount += (child as FolderScore).readCount || 0;
    }
  }

  const root: FolderScore = {
    type: "folder",
    path: "",
    lines: totalLines,
    score: totalLines > 0 ? weightedScore / totalLines : 0,
    fileCount,
    children: rootChildren.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.path.localeCompare(b.path);
    }),
  };
  if (mode === "committed") root.readCount = readCount;

  return root;
}

// ── Familiarity ──

export function getDemoFamiliarityResult(
  mode?: ScoringMode,
): FamiliarityResult {
  const m = mode || "committed";
  const files: FileScore[] = DEMO_FILES.map((f) => {
    const base: FileScore = {
      type: "file",
      path: f.path,
      lines: f.lines,
      score: 0,
    };

    switch (m) {
      case "committed":
        base.score = f.written.alice ? 1 : 0;
        base.isWritten = f.written.alice;
        break;
      case "code-coverage":
        base.score = f.familiarity.alice;
        break;
      case "weighted":
        base.blameScore = f.familiarity.alice;
        base.commitScore = Math.min(
          1,
          f.written.alice ? f.familiarity.alice * 0.9 + 0.1 : 0,
        );
        base.score = 0.5 * base.blameScore + 0.5 * base.commitScore;
        break;
    }

    return base;
  });

  const tree = buildScoringTree(files, m);
  const writtenCount = DEMO_FILES.filter((f) => f.written.alice).length;

  return {
    tree,
    repoName: REPO_NAME,
    userName: ALICE.name,
    mode: m,
    writtenCount,
    totalFiles: DEMO_FILES.length,
  };
}

// ── Hotspot ──

function classifyHotspotRisk(risk: number): HotspotRiskLevel {
  if (risk >= 0.6) return "critical";
  if (risk >= 0.4) return "high";
  if (risk >= 0.2) return "medium";
  return "low";
}

export function getDemoHotspotResult(): HotspotResult {
  const maxFreq = Math.max(...DEMO_FILES.map((f) => f.changeFrequency));

  const files: HotspotFileScore[] = DEMO_FILES.map((f) => {
    const normalizedFreq =
      maxFreq > 0 ? f.changeFrequency / maxFreq : 0;
    const familiarity = f.familiarity.alice;
    const risk = normalizedFreq * (1 - familiarity);
    return {
      path: f.path,
      lines: f.lines,
      familiarity,
      changeFrequency: f.changeFrequency,
      lastChanged: f.lastChanged ? new Date(f.lastChanged) : null,
      risk,
      riskLevel: classifyHotspotRisk(risk),
    };
  }).sort((a, b) => b.risk - a.risk);

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of files) summary[f.riskLevel]++;

  return {
    files,
    repoName: REPO_NAME,
    userName: ALICE.name,
    hotspotMode: "personal",
    timeWindow: 90,
    summary,
  };
}

// ── Coverage (contributors per file) ──

function classifyCoverageRisk(contributorCount: number): RiskLevel {
  if (contributorCount <= 1) return "risk";
  if (contributorCount <= 3) return "moderate";
  return "safe";
}

function buildCoverageTree(files: CoverageFileScore[]): CoverageFolderScore {
  const allDirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join("/"));
    }
  }

  const dirChildren = new Map<string, CoverageTreeNode[]>();

  for (const f of files) {
    const lastSlash = f.path.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? f.path.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(f);
  }

  const sortedDirs = [...allDirs].sort(
    (a, b) => b.split("/").length - a.split("/").length,
  );

  for (const dir of sortedDirs) {
    const children = dirChildren.get(dir) || [];
    let totalLines = 0;
    let fileCount = 0;
    let totalContributors = 0;

    for (const child of children) {
      totalLines += child.lines;
      if (child.type === "file") {
        fileCount++;
        totalContributors += child.contributorCount;
      } else {
        const folder = child as CoverageFolderScore;
        fileCount += folder.fileCount;
        totalContributors += folder.avgContributors * folder.fileCount;
      }
    }

    const avgContributors =
      fileCount > 0
        ? Math.round((totalContributors / fileCount) * 10) / 10
        : 0;
    const busFactor = avgContributors >= 4 ? 3 : avgContributors >= 2 ? 2 : 1;

    const folder: CoverageFolderScore = {
      type: "folder",
      path: dir,
      lines: totalLines,
      fileCount,
      avgContributors,
      busFactor,
      riskLevel: busFactor <= 1 ? "risk" : busFactor <= 2 ? "moderate" : "safe",
      children: children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.path.localeCompare(b.path);
      }),
    };

    const lastSlash = dir.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? dir.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(folder);
  }

  // Build root
  const rootChildren = dirChildren.get("") || [];
  let totalLines = 0;
  let fileCount = 0;
  let totalContributors = 0;

  for (const child of rootChildren) {
    totalLines += child.lines;
    if (child.type === "file") {
      fileCount++;
      totalContributors += (child as CoverageFileScore).contributorCount;
    } else {
      const folder = child as CoverageFolderScore;
      fileCount += folder.fileCount;
      totalContributors += folder.avgContributors * folder.fileCount;
    }
  }

  const avgContributors =
    fileCount > 0
      ? Math.round((totalContributors / fileCount) * 10) / 10
      : 0;

  return {
    type: "folder",
    path: "",
    lines: totalLines,
    fileCount,
    avgContributors,
    busFactor: 1,
    riskLevel: "risk",
    children: rootChildren.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.path.localeCompare(b.path);
    }),
  };
}

export function getDemoCoverageResult(): TeamCoverageResult {
  const coverageFiles: CoverageFileScore[] = DEMO_FILES.map((f) => ({
    type: "file" as const,
    path: f.path,
    lines: f.lines,
    contributorCount: f.contributors.length,
    contributors: f.contributors,
    riskLevel: classifyCoverageRisk(f.contributors.length),
  }));

  const tree = buildCoverageTree(coverageFiles);
  const riskFiles = coverageFiles
    .filter((f) => f.contributorCount <= 1)
    .sort((a, b) => a.contributorCount - b.contributorCount);

  return {
    tree,
    repoName: REPO_NAME,
    totalContributors: USERS.length,
    totalFiles: DEMO_FILES.length,
    riskFiles,
    overallBusFactor: 1,
  };
}

// ── Multi-User ──

function buildMultiUserTree(
  files: MultiUserFileScore[],
): MultiUserFolderScore {
  const allDirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join("/"));
    }
  }

  const dirChildren = new Map<string, MultiUserTreeNode[]>();

  for (const f of files) {
    const lastSlash = f.path.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? f.path.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(f);
  }

  const sortedDirs = [...allDirs].sort(
    (a, b) => b.split("/").length - a.split("/").length,
  );

  for (const dir of sortedDirs) {
    const children = dirChildren.get(dir) || [];
    let totalLines = 0;
    let fileCount = 0;
    const userTotals = USERS.map(() => 0);

    for (const child of children) {
      totalLines += child.lines;
      if (child.type === "file") {
        fileCount++;
        const mf = child as MultiUserFileScore;
        mf.userScores.forEach((us, i) => {
          userTotals[i] += us.score * mf.lines;
        });
      } else {
        const folder = child as MultiUserFolderScore;
        fileCount += folder.fileCount;
        folder.userScores.forEach((us, i) => {
          userTotals[i] += us.score * folder.lines;
        });
      }
    }

    const userScores: UserScore[] = USERS.map((user, i) => ({
      user,
      score: totalLines > 0 ? userTotals[i] / totalLines : 0,
    }));

    const avgScore =
      userScores.reduce((s, u) => s + u.score, 0) / userScores.length;

    const folder: MultiUserFolderScore = {
      type: "folder",
      path: dir,
      lines: totalLines,
      score: avgScore,
      fileCount,
      userScores,
      children: children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.path.localeCompare(b.path);
      }),
    };

    const lastSlash = dir.lastIndexOf("/");
    const parentDir = lastSlash >= 0 ? dir.substring(0, lastSlash) : "";
    if (!dirChildren.has(parentDir)) dirChildren.set(parentDir, []);
    dirChildren.get(parentDir)!.push(folder);
  }

  // Build root
  const rootChildren = dirChildren.get("") || [];
  let totalLines = 0;
  let fileCount = 0;
  const userTotals = USERS.map(() => 0);

  for (const child of rootChildren) {
    totalLines += child.lines;
    if (child.type === "file") {
      fileCount++;
      const mf = child as MultiUserFileScore;
      mf.userScores.forEach((us, i) => {
        userTotals[i] += us.score * mf.lines;
      });
    } else {
      const folder = child as MultiUserFolderScore;
      fileCount += folder.fileCount;
      folder.userScores.forEach((us, i) => {
        userTotals[i] += us.score * folder.lines;
      });
    }
  }

  const userScores: UserScore[] = USERS.map((user, i) => ({
    user,
    score: totalLines > 0 ? userTotals[i] / totalLines : 0,
  }));

  const avgScore =
    userScores.reduce((s, u) => s + u.score, 0) / userScores.length;

  return {
    type: "folder",
    path: "",
    lines: totalLines,
    score: avgScore,
    fileCount,
    userScores,
    children: rootChildren.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.path.localeCompare(b.path);
    }),
  };
}

export function getDemoMultiUserResult(): MultiUserResult {
  const files: MultiUserFileScore[] = DEMO_FILES.map((f) => {
    const scores = [
      f.familiarity.alice,
      f.familiarity.bob,
      f.familiarity.charlie,
      f.familiarity.diana,
    ];
    const userScores: UserScore[] = USERS.map((user, i) => ({
      user,
      score: scores[i],
      isWritten: [f.written.alice, f.written.bob, f.written.charlie, f.written.diana][i],
    }));

    return {
      type: "file" as const,
      path: f.path,
      lines: f.lines,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
      userScores,
    };
  });

  const tree = buildMultiUserTree(files);

  const userSummaries: UserSummary[] = USERS.map((user, i) => {
    const key = (["alice", "bob", "charlie", "diana"] as const)[i];
    const writtenCount = DEMO_FILES.filter((f) => f.written[key]).length;
    const totalLines = DEMO_FILES.reduce((s, f) => s + f.lines, 0);
    const weightedScore = DEMO_FILES.reduce(
      (s, f) => s + f.familiarity[key] * f.lines,
      0,
    );
    return {
      user,
      writtenCount,
      overallScore: totalLines > 0 ? weightedScore / totalLines : 0,
    };
  });

  return {
    tree,
    repoName: REPO_NAME,
    users: USERS,
    mode: "committed",
    totalFiles: DEMO_FILES.length,
    userSummaries,
  };
}

// ── Unified (composes all) ──

export function getDemoUnifiedData(): UnifiedData {
  // Team familiarity: average all 4 users' code-coverage scores per file
  const hotspotTeamFamiliarity: Record<string, number> = {};
  for (const f of DEMO_FILES) {
    const avg =
      (f.familiarity.alice +
        f.familiarity.bob +
        f.familiarity.charlie +
        f.familiarity.diana) /
      4;
    hotspotTeamFamiliarity[f.path] = avg;
  }

  return {
    repoName: REPO_NAME,
    userName: ALICE.name,
    scoring: {
      committed: getDemoFamiliarityResult("committed"),
      codeCoverage: getDemoFamiliarityResult("code-coverage"),
      weighted: getDemoFamiliarityResult("weighted"),
    },
    coverage: getDemoCoverageResult(),
    hotspot: getDemoHotspotResult(),
    hotspotTeamFamiliarity,
    multiUser: getDemoMultiUserResult(),
  };
}
