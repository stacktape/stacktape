import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathExists } from 'fs-extra';

/** Where the build writes the check's report, inside the artifact directory; it is removed before the artifact is used. */
export const PYTHON_COMPILE_REPORT_FILE = '.stacktape-python-compile.json';

/**
 * Checks the project's Python files with the function's own Python version, in the build image, before dependencies are
 * installed. It follows the imports of the entry file through the project's files (absolute imports from the build root
 * and from the entry file's directory, relative imports from the importing module's package), compiles every `.py` file
 * outside virtual environments and hidden directories, and writes a report. It never fails the build itself: whether an
 * error stops the build depends on which files the artifact keeps (`excludeFiles`), which the caller knows. Compiling
 * in memory writes no bytecode. Written for every Python version Lambda supports, 3.8 and later.
 */
const PYTHON_COMPILE_CHECK_SCRIPT = `
import ast, json, os, sys

root = os.getcwd()
entry = sys.argv[1]
report_path = sys.argv[2]
skipped = {'venv', 'env', 'site-packages', 'dist-packages', '__pycache__', 'node_modules'}

def relative(path):
    return os.path.relpath(path, root).replace(os.sep, '/')

def is_project_file(path):
    parts = relative(path).split('/')
    return not parts[0].startswith('..') and not any(part in skipped or part.startswith('.') for part in parts[:-1])

def check(path):
    try:
        with open(path, 'rb') as source_file:
            source = source_file.read()
        tree = compile(source, relative(path), 'exec', ast.PyCF_ONLY_AST, dont_inherit=True)
        compile(tree, relative(path), 'exec', dont_inherit=True)
        return tree, None
    except SyntaxError as error:
        found = {'error': type(error).__name__ + ': ' + str(error.msg)}
        if error.lineno:
            found['line'] = error.lineno
        if (error.text or '').strip():
            found['code'] = error.text.strip()
        return None, found
    except (ValueError, UnicodeDecodeError, OSError) as error:
        return None, {'error': type(error).__name__ + ': ' + str(error)}

def resolve(dotted, base):
    found = []
    directory = base
    parts = [part for part in dotted.split('.') if part]
    for index, part in enumerate(parts):
        path = os.path.join(directory, part)
        last = index == len(parts) - 1
        if os.path.isfile(os.path.join(path, '__init__.py')):
            found.append(os.path.join(path, '__init__.py'))
            directory = path
        elif last and os.path.isfile(path + '.py'):
            found.append(path + '.py')
        elif os.path.isdir(path):
            directory = path
        else:
            return None, None
    return found, directory

def imported_files(path, tree):
    module_directory = os.path.dirname(path)
    absolute_bases = [root, os.path.dirname(os.path.join(root, entry))]
    files = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            requests = [(alias.name, [], absolute_bases) for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                base = module_directory
                for _ in range(node.level - 1):
                    base = os.path.dirname(base)
                bases = [base]
            else:
                bases = absolute_bases
            requests = [(node.module or '', [alias.name for alias in node.names if alias.name != '*'], bases)]
        else:
            continue
        for module, names, bases in requests:
            for base in dict.fromkeys(bases):
                found, directory = resolve(module, base)
                if found is None:
                    continue
                files.extend(found)
                for name in names:
                    submodule, _ = resolve(name, directory)
                    files.extend(submodule or [])
                break
    return files

errors = {}
imported = []
pending = [os.path.join(root, entry)]
while pending:
    path = os.path.normpath(pending.pop())
    if relative(path) in imported or not os.path.isfile(path) or not is_project_file(path):
        continue
    imported.append(relative(path))
    tree, error = check(path)
    if error:
        errors[relative(path)] = dict(error, file=relative(path), imported=True)
    else:
        pending.extend(imported_files(path, tree))

for directory, directories, files in os.walk(root):
    directories[:] = sorted(name for name in directories if name not in skipped and not name.startswith('.'))
    for name in sorted(files):
        path = os.path.join(directory, name)
        if name.endswith('.py') and relative(path) not in imported:
            _, error = check(path)
            if error:
                errors[relative(path)] = dict(error, file=relative(path), imported=False)

with open(report_path, 'w') as report:
    json.dump({'entry': entry, 'imported': sorted(imported), 'errors': list(errors.values())}, report)
`;

/** The Dockerfile step that runs the check in the build root (`/dist`) for the entry file in `STP_PY_ENTRY`. */
export const PYTHON_COMPILE_CHECK_COMMAND = `RUN python -c "import base64; exec(base64.b64decode('${Buffer.from(
  PYTHON_COMPILE_CHECK_SCRIPT
).toString('base64')}'))" "$STP_PY_ENTRY" /dist/${PYTHON_COMPILE_REPORT_FILE}`;

export type PythonCompileError = { file: string; imported: boolean; line?: number; error: string; code?: string };
export type PythonCompileReport = { entry: string; imported: string[]; errors: PythonCompileError[] };

/** Reads the build's report and removes it from the artifact directory. Paths in it are relative to that directory. */
export const takePythonCompileReport = async (distFolderPath: string): Promise<PythonCompileReport | undefined> => {
  const reportPath = join(distFolderPath, PYTHON_COMPILE_REPORT_FILE);
  if (!(await pathExists(reportPath))) return undefined;
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as PythonCompileReport;
  await rm(reportPath, { force: true });
  return report;
};

/**
 * Splits the report's errors by consequence. A file the entry file imports, directly or through other project files,
 * would fail the function when it loads: it stops the build. Any other file only might be loaded (a script, a test, a
 * template, vendored Python 2 code): it is reported. Files the artifact does not keep (`excludeFiles`) are ignored.
 */
export const classifyPythonCompileErrors = async ({
  report,
  isPackaged
}: {
  report: PythonCompileReport;
  /** Whether the artifact keeps the file, by its path relative to the build root. */
  isPackaged: (file: string) => Promise<boolean>;
}) => {
  const packaged = (
    await Promise.all(report.errors.map(async (error) => ((await isPackaged(error.file)) ? [error] : [])))
  ).flat();
  return {
    blocking: packaged.filter(({ imported }) => imported),
    other: packaged.filter(({ imported }) => !imported)
  };
};

export const describePythonCompileError = (
  { line, error, code }: PythonCompileError,
  displayPath: string,
  { withCode = true }: { withCode?: boolean } = {}
) => `${displayPath}${line === undefined ? '' : `, line ${line}`}: ${error}${withCode && code ? `\n    ${code}` : ''}`;
