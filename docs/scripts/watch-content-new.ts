import { readdirSync, statSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_DIR = join(process.cwd(), '_new-docs');
const SNIPPETS_DIR = join(process.cwd(), 'code-snippets');
const OUTPUT_FILE = join(process.cwd(), 'public', '_timestamps.json');

// Debounce settings
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 100;

function getMaxTimestamp(dir: string): number {
  let maxTime = 0;

  function scanDir(currentDir: string) {
    try {
      const files = readdirSync(currentDir);
      for (const file of files) {
        const filePath = join(currentDir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          scanDir(filePath);
        } else if (
          file.endsWith('.mdx') ||
          file.endsWith('.md') ||
          file.endsWith('.yml') ||
          file.endsWith('.yaml') ||
          file.endsWith('.ts') ||
          file.endsWith('.js')
        ) {
          maxTime = Math.max(maxTime, stat.mtime.getTime());
        }
      }
    } catch {
      // Ignore errors
    }
  }

  scanDir(dir);
  return maxTime;
}

function updateTimestamps() {
  const docsMax = getMaxTimestamp(DOCS_DIR);
  const snippetsMax = getMaxTimestamp(SNIPPETS_DIR);
  const maxTimestamp = Math.max(docsMax, snippetsMax);

  writeFileSync(OUTPUT_FILE, JSON.stringify({ maxTimestamp, updated: Date.now() }));
  console.info(`📝 Timestamps updated: ${new Date(maxTimestamp).toLocaleTimeString()}`);
}

// Debounced update to avoid duplicate triggers
function debouncedUpdate(filename: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    console.info(`🔄 Changed: ${filename}`);
    updateTimestamps();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

// Initial update
updateTimestamps();

// Watch both directories
console.info(`👀 Watching for content changes (NEW DOCS)...
  - ${DOCS_DIR}
  - ${SNIPPETS_DIR}
`);

function setupWatcher(dir: string) {
  try {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (
        filename &&
        (filename.endsWith('.mdx') ||
          filename.endsWith('.md') ||
          filename.endsWith('.yml') ||
          filename.endsWith('.yaml') ||
          filename.endsWith('.ts') ||
          filename.endsWith('.js'))
      ) {
        debouncedUpdate(filename);
      }
    });
  } catch (err) {
    console.error(`Failed to watch ${dir}:`, err);
  }
}

setupWatcher(DOCS_DIR);
setupWatcher(SNIPPETS_DIR);

// Keep the process running
process.on('SIGINT', () => {
  console.info('\n👋 Stopping watcher...');
  process.exit(0);
});
