import type { GitClient } from './client.js';
import type { UserIdentity } from '../core/types.js';

export async function resolveUser(
  gitClient: GitClient,
  userFlag?: string,
): Promise<UserIdentity> {
  if (userFlag) {
    // If it looks like an email, use it as email; otherwise as name
    if (userFlag.includes('@')) {
      return { name: userFlag, email: userFlag };
    }
    return { name: userFlag, email: userFlag };
  }

  const name = await gitClient.getUserName();
  const email = await gitClient.getUserEmail();

  if (!name && !email) {
    throw new Error(
      'Could not determine git user. Set git config user.name/user.email or use --user flag.',
    );
  }

  return { name, email };
}

export function matchesUser(
  authorName: string,
  authorEmail: string,
  user: UserIdentity,
): boolean {
  // Match by email (primary) or name (fallback)
  if (user.email && authorEmail) {
    if (authorEmail.toLowerCase() === user.email.toLowerCase()) return true;
  }
  if (user.name && authorName) {
    if (authorName.toLowerCase() === user.name.toLowerCase()) return true;
  }
  return false;
}
