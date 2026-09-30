import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const checkDocumentLinks = (document: string, repositoryRoot: string): string[] => {
  const content = readFileSync(document, 'utf8').replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, (block) =>
    block.replace(/[^\n]/g, ' ')
  );
  const consolePresent = existsSync(resolve(repositoryRoot, 'apps/console/api/package.json'));
  const failures: string[] = [];
  // Inline links/images and reference definitions; code examples and remote URLs are not repository paths.
  const links = /!?\[[^\]\n]*\]\((<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\)|^\[[^\]\n]+\]:\s*(<[^>\n]+>|[^\s]+)/gm;
  for (const match of content.matchAll(links)) {
    const target = (match[1] ?? match[2]!).replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('/') || target.startsWith('#')) continue;
    const path = decodeURIComponent(target.split(/[?#]/, 1)[0]!);
    const resolved = resolve(dirname(document), path);
    const repositoryPath = relative(repositoryRoot, resolved).replaceAll('\\', '/');
    // Public clones deliberately omit this one private boundary. Check it whenever Console is initialized.
    if (!consolePresent && (repositoryPath === 'apps/console' || repositoryPath.startsWith('apps/console/'))) continue;
    if (!existsSync(resolved)) {
      const line = content.slice(0, match.index).split('\n').length;
      failures.push(`${relative(repositoryRoot, document)}:${line}: missing link target ${target}`);
    }
  }
  return failures;
};

const main = () => {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const repositories = [repositoryRoot];
  const consoleRoot = resolve(repositoryRoot, 'apps/console');
  if (existsSync(resolve(consoleRoot, 'api/package.json'))) repositories.push(consoleRoot);
  const documents = repositories.flatMap((repository) =>
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: repository,
      encoding: 'utf8'
    })
      .split('\0')
      .filter((file) => file.endsWith('.md') && !/(^|\/)(@generated|generated|content|starter-projects)\//.test(file))
      .map((file) => resolve(repository, file))
      .filter(existsSync)
  );
  const failures = [...new Set(documents.flatMap((document) => checkDocumentLinks(document, repositoryRoot)))];
  for (const failure of failures) console.error(failure);
  if (failures.length) process.exitCode = 1;
  else console.info(`Repository links passed in ${documents.length} maintainer and instruction documents.`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
