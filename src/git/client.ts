import simpleGit, { type SimpleGit } from 'simple-git';

export class GitClient {
  private git: SimpleGit;
  readonly repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async isRepo(): Promise<boolean> {
    return this.git.checkIsRepo();
  }

  async getRepoRoot(): Promise<string> {
    return (await this.git.revparse(['--show-toplevel'])).trim();
  }

  async getRepoName(): Promise<string> {
    const root = await this.getRepoRoot();
    return root.split('/').pop() || 'unknown';
  }

  async listFiles(): Promise<string[]> {
    const result = await this.git.raw(['ls-files']);
    return result.trim().split('\n').filter(Boolean);
  }

  async getUserName(): Promise<string> {
    return (await this.git.raw(['config', 'user.name'])).trim();
  }

  async getUserEmail(): Promise<string> {
    return (await this.git.raw(['config', 'user.email'])).trim();
  }

  async getLog(args: string[]): Promise<string> {
    return this.git.raw(['log', ...args]);
  }

  async blame(filePath: string, options: string[] = []): Promise<string> {
    return this.git.raw(['blame', ...options, '--', filePath]);
  }

  async diff(args: string[]): Promise<string> {
    return this.git.raw(['diff', ...args]);
  }

  async show(args: string[]): Promise<string> {
    return this.git.raw(['show', ...args]);
  }

  async raw(args: string[]): Promise<string> {
    return this.git.raw(args);
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const result = await this.git.raw(['remote', 'get-url', 'origin']);
      return result.trim();
    } catch {
      return null;
    }
  }
}
