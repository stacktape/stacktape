import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  typescriptDefaults
} from 'monaco-editor/languages/features/typescript/register.js';

/**
 * TypeScript in the config editor: Monaco's TypeScript language service, checking `stacktape.ts` against the
 * `stacktape` package's own declarations. Completions, hover docs, go to definition and type errors work as they do in
 * an IDE with the package installed.
 *
 * The declarations are the ones the npm package publishes (`generate:monaco` in the CLI), served from this bundle as
 * `stacktape-types/*.d.ts` (`vite.config.ts`), and placed where TypeScript's Node resolution finds
 * `import ... from 'stacktape'`. They load once, the first time a TypeScript editor opens; the language service runs in
 * its own worker (`monaco-setup.ts`).
 */
const DECLARATIONS = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;

let loading: Promise<void> | undefined;

export const loadStacktapeTypes = (): Promise<void> =>
  (loading ??= (async () => {
    typescriptDefaults.setCompilerOptions({
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      lib: ['esnext'],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      allowNonTsExtensions: true,
      types: []
    });
    typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true
    });
    // Errors appear as the file is edited, not only once it is focused.
    typescriptDefaults.setEagerModelSync(true);
    const files = await Promise.all(
      DECLARATIONS.map(async (name) => {
        const response = await fetch(new URL(`stacktape-types/${name}`, document.baseURI));
        if (!response.ok) throw new Error(`The stacktape types could not be loaded (${name}).`);
        return { filePath: `file:///node_modules/stacktape/${name}`, content: await response.text() };
      })
    );
    typescriptDefaults.setExtraLibs([
      ...files,
      {
        filePath: 'file:///node_modules/stacktape/package.json',
        content: JSON.stringify({ name: 'stacktape', types: 'index.d.ts' })
      }
    ]);
  })().catch((error: unknown) => {
    // A later editor tries again.
    loading = undefined;
    throw error;
  }));
