/**
 * The project's file tree, fitted to the rows a pane has.
 *
 * The scan draws the repository the way a developer pictures it: in each folder at most two files, the ones that say
 * what the project is (its manifests, Dockerfile, compose file, `.env.example`, config files and entry points), then
 * "+N more", then its sub-folders. Files come before folders so a project's manifests are at the top, where the first
 * lines of stacktape.yml are written beside them. Files the analysis opened or cited are always on screen, wherever they are. Folders with
 * nothing that matters fold into one row with a count; folders open further while there is room. Pure functions over
 * paths, so what a tree shows can be tested without a browser.
 */

export type TreeDirectory = {
  name: string;
  /** Repository-relative, `''` for the root. */
  path: string;
  directories: TreeDirectory[];
  /** Full paths of the files directly in it, in name order. */
  files: string[];
  /** Every file below it. */
  fileCount: number;
};

export type TreeRow =
  /** `label` joins a chain of folders that hold nothing but the next one: `components/ui`. */
  | { kind: 'directory'; key: string; path: string; label: string; depth: number; open: boolean; fileCount: number }
  /** `name` is the file's name, or its path from the row's folder when it is alone in a folder: `webhook/route.ts`. */
  | { kind: 'file'; key: string; path: string; name: string; depth: number }
  /** What a folder leaves out: `count` files, and `folders` folders with nothing that matters in them. */
  | { kind: 'more'; key: string; path: string; depth: number; count: number; folders: number };

const byName = (left: string, right: string) => {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a < b ? -1 : a > b ? 1 : left < right ? -1 : left > right ? 1 : 0;
};
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** The tree of a list of file paths. Repeated paths count once. */
export const buildTree = (paths: Iterable<string>): TreeDirectory => {
  const root: TreeDirectory = { name: '', path: '', directories: [], files: [], fileCount: 0 };
  const directories = new Map<string, TreeDirectory>([['', root]]);
  const seen = new Set<string>();
  for (const path of paths) {
    if (path === '' || seen.has(path)) continue;
    seen.add(path);
    const segments = path.split('/');
    let current = root;
    for (const segment of segments.slice(0, -1)) {
      const childPath = current.path === '' ? segment : `${current.path}/${segment}`;
      let child = directories.get(childPath);
      if (child === undefined) {
        child = { name: segment, path: childPath, directories: [], files: [], fileCount: 0 };
        directories.set(childPath, child);
        current.directories.push(child);
      }
      current = child;
    }
    current.files.push(path);
  }
  const finish = (directory: TreeDirectory): number => {
    directory.directories.sort((left, right) => byName(left.name, right.name));
    directory.files.sort((left, right) => byName(nameOf(left), nameOf(right)));
    directory.fileCount = directory.files.length + directory.directories.reduce((sum, child) => sum + finish(child), 0);
    return directory.fileCount;
  };
  finish(root);
  return root;
};

const MANIFEST =
  /^(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|pipfile|setup\.py|go\.mod|gemfile|composer\.json|cargo\.toml|pom\.xml|build\.gradle(\.kts)?|mix\.exs|deno\.jsonc?)$/i;
const CONTAINER = /^(dockerfile([.-][\w.-]+)?|[\w.-]+\.dockerfile|(docker-)?compose([.-][\w-]+)?\.ya?ml)$/i;
const ENVIRONMENT = /^\.env(\.(example|sample|template|dist|defaults))?$/i;
const DEPLOY =
  /^(fly\.toml|render\.ya?ml|vercel\.json|netlify\.toml|railway\.(json|toml)|procfile|app\.ya?ml|serverless\.ya?ml|sst\.config\.ts|nixpacks\.toml|stacktape\.(ya?ml|ts)|schema\.prisma|alembic\.ini|main\.tf)$/i;
const CONFIG = /\.config\.(ts|js|mjs|cjs|mts|cts)$/i;
const ENTRY = /^(main|server|app|wsgi|asgi|manage)\.(py|go|ts|js|mjs|rs|rb)$/i;
const INDEX = /^index\.(ts|js|mjs)$/i;

/**
 * How much a file says about what the project is and how it runs: 2 for manifests, container and deploy files and
 * the example environment, 1 for config files and entry points, 0 for the rest.
 */
export const importanceOf = (path: string): number => {
  const name = nameOf(path);
  if (MANIFEST.test(name) || CONTAINER.test(name) || ENVIRONMENT.test(name) || DEPLOY.test(name)) return 2;
  if (CONFIG.test(name) || ENTRY.test(name)) return 1;
  // `index.ts` is an entry point at the top of an app, and just a module anywhere deeper.
  if (INDEX.test(name) && /^(?:[^/]+\/)?(?:(?:src|server)\/)?[^/]+$/.test(path)) return 1;
  return 0;
};

const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|php|rs|java|kt|cs|ex|exs|vue|svelte|astro|sql|prisma)$/i;
const BACKGROUND =
  /^(\..*|license(\.\w+)?|.*\.lock|.*-lock\.(json|yaml)|go\.sum|.*\.(png|jpe?g|gif|svg|ico|webp|woff2?))$/i;

/** Which other files fill a folder's two places: its readme, then code, then the rest, lock files and dotfiles last. */
const fillerRank = (path: string): number => {
  const name = nameOf(path);
  if (/^readme/i.test(name)) return 0;
  if (SOURCE.test(name)) return 1;
  if (BACKGROUND.test(name)) return 3;
  return 2;
};

export type FitOptions = {
  /** Files that must be on screen: what the analysis opened or cited. */
  pinned: ReadonlySet<string>;
  /** Rows the pane has room for. */
  budget: number;
  /** Files a folder shows before "+N more". */
  perFolder?: number;
};

type Plan = {
  open: Set<string>;
  /** Folders fill their places with other files, not only those that matter. */
  fillers: boolean;
  /** Important files show even when nothing pinned them. */
  important: boolean;
  /** Folders whose folded sub-folders without a pinned file are counted in their "+N more" row, not listed. */
  grouped: Set<string>;
};

/** The folder a row stands for, after a chain of folders holding only the next one. */
const collapseChain = (directory: TreeDirectory): { last: TreeDirectory; label: string } => {
  let last = directory;
  let label = directory.name;
  while (last.files.length === 0 && last.directories.length === 1) {
    last = last.directories[0]!;
    label = `${label}/${last.name}`;
  }
  return { last, label };
};

/** The files a folder shows, in name order, and how many it leaves to "+N more". */
const shownFiles = (
  directory: TreeDirectory,
  plan: Plan,
  pinned: ReadonlySet<string>,
  perFolder: number
): { shown: string[]; hidden: number } => {
  const shown = new Set(
    directory.files.filter((path) => pinned.has(path) || (plan.important && importanceOf(path) > 0))
  );
  if (plan.fillers && shown.size < perFolder) {
    const others = directory.files
      .filter((path) => !shown.has(path))
      .toSorted((left, right) => fillerRank(left) - fillerRank(right));
    for (const path of others.slice(0, perFolder - shown.size)) shown.add(path);
  }
  return { shown: directory.files.filter((path) => shown.has(path)), hidden: directory.files.length - shown.size };
};

const holdsAny = (directory: TreeDirectory, pinned: ReadonlySet<string>): boolean =>
  directory.files.some((path) => pinned.has(path)) || directory.directories.some((child) => holdsAny(child, pinned));

const rowsFor = (root: TreeDirectory, plan: Plan, pinned: ReadonlySet<string>, perFolder: number): TreeRow[] => {
  const rows: TreeRow[] = [];
  const visit = (directory: TreeDirectory, depth: number) => {
    const { shown, hidden } = shownFiles(directory, plan, pinned, perFolder);
    const groupable = (last: TreeDirectory) => !plan.open.has(last.path) && !holdsAny(last, pinned);
    const candidates = directory.directories.filter((child) => groupable(collapseChain(child).last)).length;
    // Counting one folder in a row of its own saves nothing.
    const grouping = plan.grouped.has(directory.path) && (candidates > 1 || (candidates === 1 && hidden > 0));
    const groupedFolders = grouping ? candidates : 0;
    // "+1 more" takes the row the file itself would.
    const listed = hidden === 1 && groupedFolders === 0 ? directory.files : shown;
    // Files first: a folder's manifests and config say what it is before its sub-folders do.
    for (const path of listed) rows.push({ kind: 'file', key: `f:${path}`, path, name: nameOf(path), depth });
    const count = directory.files.length - listed.length;
    if (count > 0 || groupedFolders > 0) {
      rows.push({
        kind: 'more',
        key: `m:${directory.path}`,
        path: directory.path,
        depth,
        count,
        folders: groupedFolders
      });
    }
    for (const child of directory.directories) {
      const { last, label } = collapseChain(child);
      const open = plan.open.has(last.path);
      if (grouping && groupable(last)) continue;
      // A folder with one file is that file, with its folder in its name: the same one row says more.
      if (last.fileCount === 1 && last.files.length === 1) {
        const path = last.files[0]!;
        rows.push({ kind: 'file', key: `f:${path}`, path, name: `${label}/${nameOf(path)}`, depth });
        continue;
      }
      rows.push({
        kind: 'directory',
        key: `d:${last.path}`,
        path: last.path,
        label,
        depth,
        open,
        fileCount: last.fileCount
      });
      if (open) visit(last, depth + 1);
    }
  };
  visit(root, 0);
  return rows;
};

/** Every folder a row can stand for (the last of each chain), with its depth in rows and whether it holds `test`. */
const folders = (root: TreeDirectory, test: (path: string) => boolean) => {
  const all: Array<{ directory: TreeDirectory; depth: number; holds: boolean; parent: string }> = [];
  const visit = (directory: TreeDirectory, depth: number): boolean => {
    let holds = directory.files.some(test);
    for (const child of directory.directories) {
      const { last } = collapseChain(child);
      const entry = { directory: last, depth, holds: false, parent: directory.path };
      all.push(entry);
      entry.holds = visit(last, depth + 1);
      holds ||= entry.holds;
    }
    return holds;
  };
  visit(root, 0);
  return all;
};

/**
 * The rows that show `root` in `budget` rows, or as close as the pinned files allow.
 *
 * Folders holding a pinned or important file start open, the rest folded. Over budget, in this order until it fits:
 * folders without a pinned file fold (deepest first), folders stop filling their places with other files, only
 * pinned files are listed, and folded folders without a pinned file are counted in their parent's "+N more" row
 * (deepest parents first). With room left (also after folding a folder too big for it), folded folders open from the
 * top down while they fit.
 */
export const fitTree = (root: TreeDirectory, { pinned, budget, perFolder = 2 }: FitOptions): TreeRow[] => {
  const isPinned = (path: string) => pinned.has(path);
  const matters = (path: string) => pinned.has(path) || importanceOf(path) > 0;
  const withPinned = folders(root, isPinned);
  const withImportant = folders(root, matters);
  const plan: Plan = {
    open: new Set(withImportant.filter((entry) => entry.holds).map((entry) => entry.directory.path)),
    fillers: true,
    important: true,
    grouped: new Set()
  };
  const rows = () => rowsFor(root, plan, pinned, perFolder);
  const fits = () => rows().length <= budget;

  if (!fits()) {
    const pinnedFolders = new Set(withPinned.filter((entry) => entry.holds).map((entry) => entry.directory.path));
    const foldable = withImportant
      .filter((entry) => plan.open.has(entry.directory.path) && !pinnedFolders.has(entry.directory.path))
      .toSorted((left, right) => right.depth - left.depth);
    for (const entry of foldable) {
      if (fits()) break;
      plan.open.delete(entry.directory.path);
    }
    if (!fits()) plan.fillers = false;
    if (!fits()) {
      plan.important = false;
      for (const entry of withImportant) {
        if (!pinnedFolders.has(entry.directory.path)) plan.open.delete(entry.directory.path);
      }
    }
    if (!fits()) {
      // The open folders, deepest first, then the root.
      const parents = [
        ...withPinned
          .filter((entry) => plan.open.has(entry.directory.path))
          .toSorted((left, right) => right.depth - left.depth)
          .map((entry) => entry.directory.path),
        ''
      ];
      for (const parent of parents) {
        if (fits()) break;
        plan.grouped.add(parent);
      }
    }
    // Pressed for room: only folding a folder too big for the pane leaves room for smaller ones.
    if (!plan.fillers) return rows();
  }

  // Room left: open folded folders from the top down, each one only if all of it fits.
  for (let opened = true; opened;) {
    opened = false;
    const visible = new Set(['', ...plan.open]);
    const candidates = withImportant
      .filter((entry) => !plan.open.has(entry.directory.path) && visible.has(entry.parent))
      .toSorted((left, right) => left.depth - right.depth);
    for (const entry of candidates) {
      plan.open.add(entry.directory.path);
      if (fits()) {
        opened = true;
      } else {
        plan.open.delete(entry.directory.path);
      }
    }
  }
  return rows();
};

/** "+3 more", "+5 folders, 4 files", "+2 folders". */
export const moreLabel = (row: Extract<TreeRow, { kind: 'more' }>): string =>
  row.folders === 0
    ? `+${row.count} more`
    : `+${row.folders} ${row.folders === 1 ? 'folder' : 'folders'}${row.count === 0 ? '' : `, ${row.count} ${row.count === 1 ? 'file' : 'files'}`}`;

/** "55 files", "5,000+ files". */
export const fileCountLabel = (count: number, truncated: boolean): string =>
  `${count.toLocaleString('en-US')}${truncated ? '+' : ''} ${count === 1 && !truncated ? 'file' : 'files'}`;
