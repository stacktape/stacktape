import vm from 'node:vm';
import * as stacktapeAuthoringRuntime from '@stacktape/config-authoring';
import { convertAuthoringConfigToYaml } from '@stacktape/config-authoring/converter';
import { projectSettingsFromSource } from '@domain-services/config-manager/project-settings';

/** What the page learns from an edited `stacktape.ts`: the configuration it defines, as YAML, or why there is none. */
export type TypescriptEvaluation = { yaml: string } | { error: string; line?: number };

/** Long enough for any configuration, short enough that a loop typed by mistake does not stall the wizard. */
const EVALUATION_TIMEOUT_MS = 1500;

/** The one global the evaluation script reads its inputs from; set for the length of one synchronous run. */
const SLOT = '__stacktapeInitTypescriptConfig';

/**
 * Runs an edited `stacktape.ts` the way `stacktape deploy` runs it, and returns the configuration it defines as YAML,
 * so the diagram, the settings and the price follow the TypeScript like they follow hand-edited YAML.
 *
 * The text is the user's own, typed into the wizard on this machine, and the CLI runs the same file on every deploy, so
 * running it here grants nothing new. Two things differ from a deploy, to keep the wizard responsive:
 *
 * - It runs with a time limit. A loop typed by mistake fails the evaluation instead of freezing the wizard's server.
 * - It can import `stacktape` only, served from the CLI's own authoring runtime. A file that imports another module is
 *   saved as written; the wizard says it cannot show it.
 *
 * Before it runs, the project settings (`defineConfig({ projectName, region }, ...)`) are read the way every command
 * reads them, without running the file, so an edit that hides them from that read is caught here, not at deploy.
 */
export const evaluateTypescriptConfig = async ({
  source,
  projectName,
  region,
  stage = 'dev'
}: {
  source: string;
  projectName: string;
  region: string;
  stage?: string;
}): Promise<TypescriptEvaluation> => {
  const ts = (await import('typescript')).default;
  const output = ts.transpileModule(source, {
    fileName: 'stacktape.ts',
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      sourceMap: false
    }
  });
  const syntaxError = output.diagnostics?.find((entry) => entry.category === ts.DiagnosticCategory.Error);
  if (syntaxError !== undefined) {
    const line =
      syntaxError.file !== undefined && syntaxError.start !== undefined
        ? syntaxError.file.getLineAndCharacterOfPosition(syntaxError.start).line + 1
        : undefined;
    return {
      error: ts.flattenDiagnosticMessageText(syntaxError.messageText, ' '),
      ...(line === undefined ? {} : { line })
    };
  }

  try {
    await projectSettingsFromSource({ source, filePath: 'stacktape.ts' });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  const module = { exports: {} as Record<string, unknown> };
  const slot = {
    module,
    require: (id: string) => {
      if (id === 'stacktape') return stacktapeAuthoringRuntime;
      throw new Error(`The wizard can run a stacktape.ts that imports 'stacktape' only. This one imports '${id}'.`);
    },
    toYaml: (value: unknown) => {
      if (value === undefined) {
        throw new Error(
          'stacktape.ts has no default export. Export the configuration with export default defineConfig(...).'
        );
      }
      return convertAuthoringConfigToYaml(value as Parameters<typeof convertAuthoringConfigToYaml>[0], {
        projectName,
        region,
        stage,
        command: 'deploy'
      });
    }
  };
  const globals = globalThis as Record<string, unknown>;
  globals[SLOT] = slot;
  try {
    // One script does everything, the call into `defineConfig`'s function included, so the time limit covers all of it.
    const yaml = vm.runInThisContext(
      `(function (exports, require, module) {\n${output.outputText}\n})(${SLOT}.module.exports, ${SLOT}.require, ${SLOT}.module);\n${SLOT}.toYaml(${SLOT}.module.exports.default);`,
      { filename: 'stacktape.ts', timeout: EVALUATION_TIMEOUT_MS }
    ) as string;
    return { yaml };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: /timed out/i.test(message)
        ? `stacktape.ts did not finish within ${EVALUATION_TIMEOUT_MS / 1000} seconds. Is there a loop that never ends?`
        : message
    };
  } finally {
    delete globals[SLOT];
  }
};
