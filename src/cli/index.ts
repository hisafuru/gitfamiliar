import { Command } from 'commander';
import { parseOptions } from './options.js';
import { computeFamiliarity } from '../core/familiarity.js';
import { renderTerminal } from './output/terminal.js';
import { generateAndOpenHTML } from './output/html.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('gitfamiliar')
    .description('Visualize your code familiarity from Git history')
    .version('0.1.0')
    .option('-m, --mode <mode>', 'Scoring mode: binary, authorship, review-coverage, weighted', 'binary')
    .option('-u, --user <user>', 'Git user name or email (defaults to git config)')
    .option('-f, --filter <filter>', 'Filter mode: all, written, reviewed', 'all')
    .option('-e, --expiration <policy>', 'Expiration policy: never, time:180d, change:50%, combined:365d:50%', 'never')
    .option('--html', 'Generate HTML treemap report', false)
    .option('-w, --weights <weights>', 'Weights for weighted mode: blame,commit,review (e.g., "0.5,0.35,0.15")')
    .action(async (rawOptions) => {
      try {
        const repoPath = process.cwd();
        const options = parseOptions(rawOptions, repoPath);
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
