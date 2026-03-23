import { publicApiClient } from '@shared/trpc/public';
import { convertYamlToTypescript } from '@shared/utils/config-converter';
import { stringifyToYaml } from '@shared/utils/yaml';
import { writeFile, pathExists } from 'fs-extra';
import { join } from 'node:path';
import prettier from 'prettier';
import type { ConfigGenProgressCallback, ConfigGenResult, ConfigGenPhaseInfo, ConfigGenOptions } from './types';
import { ConfigGenError } from './types';
import {
  listAllFilesInDirectory,
  getPrettyPrintedFiles,
  tryGetContentTruncated,
  DEFAULT_IGNORE_PATTERNS
} from './file-scanner';

export { DEFAULT_IGNORE_PATTERNS, getPrettyPrintedFiles, listAllFilesInDirectory, tryGetContentTruncated };
export * from './types';

const POLL_INTERVAL_MS = 500;
const MAX_POLL_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

const PHASE_MESSAGES: Record<string, string> = {
  FILE_SELECTION: 'Analyzing project structure...',
  WAITING_FOR_FILE_CONTENTS: 'Reading selected files...',
  ANALYZING_DEPLOYMENTS: 'Identifying deployable units...',
  GENERATING_CONFIG: 'Generating Stacktape configuration...',
  ADJUSTING_ENV_VARS: 'Configuring environment variables...'
};

/** Human-readable phase display names for UI */
export const PHASE_DISPLAY_NAMES: Record<string, string> = {
  FILE_SELECTION: 'Scanning files',
  WAITING_FOR_FILE_CONTENTS: 'Reading files',
  ANALYZING_DEPLOYMENTS: 'Analyzing code',
  GENERATING_CONFIG: 'Generating config',
  ADJUSTING_ENV_VARS: 'Configuring env vars'
};

/** Get human-readable display name for a config gen phase */
export const getPhaseDisplayName = (phase: string): string => {
  return PHASE_DISPLAY_NAMES[phase] || phase;
};

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound') ||
      msg.includes('etimedout') ||
      msg.includes('abort') ||
      msg.includes('socket')
    );
  }
  return false;
};

export class ConfigGenManager {
  #sessionId: string | null = null;
  #cancelled = false;
  #workingDirectory: string = process.cwd();
  #lastPhase: string | null = null;

  setWorkingDirectory(dir: string): void {
    this.#workingDirectory = dir;
  }

  async generate(onProgress?: ConfigGenProgressCallback, options?: ConfigGenOptions): Promise<ConfigGenResult> {
    const cwd = this.#workingDirectory;
    this.#cancelled = false;
    this.#lastPhase = null;

    publicApiClient.init();

    // Phase 1: Scan local files
    this.#reportProgress(onProgress, {
      phase: 'FILE_SELECTION',
      message: 'Scanning project files...'
    });

    const allFiles = await listAllFilesInDirectory(cwd, [
      ...DEFAULT_IGNORE_PATTERNS,
      '**/stacktape.yml',
      '**/stacktape.yaml',
      '**/stacktape.ts'
    ]);

    this.#throwIfCancelled();

    if (allFiles.length === 0) {
      throw new ConfigGenError({
        message: 'No project files found in the current directory',
        code: 'EMPTY_PROJECT',
        phase: 'FILE_SELECTION',
        retryable: false
      });
    }

    const fileTree = getPrettyPrintedFiles(allFiles);

    this.#reportProgress(onProgress, {
      phase: 'FILE_SELECTION',
      message: 'Analyzing project structure...',
      details: { totalFiles: allFiles.length }
    });

    // Phase 2: Start server session (deterministic file selection)
    let sessionId: string;
    let filesToRead: string[];
    try {
      const response = await publicApiClient.startCliConfigGen({
        fileTree,
        allFiles,
        productionReadiness: options?.productionReadiness
      });
      sessionId = response.sessionId;
      filesToRead = response.filesToRead;
    } catch (error) {
      throw this.#wrapApiError(error, 'FILE_SELECTION');
    }

    this.#sessionId = sessionId;
    this.#throwIfCancelled();

    this.#reportProgress(onProgress, {
      phase: 'WAITING_FOR_FILE_CONTENTS',
      message: `Reading ${filesToRead.length} selected files...`,
      details: {
        selectedFiles: filesToRead,
        filesToRead: filesToRead.length,
        filesRead: 0
      }
    });

    // Phase 3: Read selected files locally
    const fileContents: Array<{ path: string; content: string }> = [];
    for (let i = 0; i < filesToRead.length; i++) {
      this.#throwIfCancelled();

      const filePath = filesToRead[i];
      const content = await tryGetContentTruncated(filePath, cwd);
      fileContents.push({ path: filePath, content });

      this.#reportProgress(onProgress, {
        phase: 'WAITING_FOR_FILE_CONTENTS',
        message: `Reading files... (${i + 1}/${filesToRead.length})`,
        details: {
          selectedFiles: filesToRead,
          filesToRead: filesToRead.length,
          filesRead: i + 1
        }
      });
    }

    // Phase 4: Submit files to server for analysis
    this.#reportProgress(onProgress, {
      phase: 'ANALYZING_DEPLOYMENTS',
      message: 'Analyzing deployment requirements...'
    });

    try {
      await publicApiClient.submitCliConfigGenFiles({ sessionId, files: fileContents });
    } catch (error) {
      throw this.#wrapApiError(error, 'ANALYZING_DEPLOYMENTS');
    }

    // Phase 5: Poll for result
    return this.#pollForResult(onProgress);
  }

  async cancel(): Promise<void> {
    this.#cancelled = true;
    if (this.#sessionId) {
      try {
        await publicApiClient.cancelCliConfigGen(this.#sessionId);
      } catch {
        // Best-effort cancellation
      }
      this.#sessionId = null;
    }
  }

  async writeConfig(config: StacktapeConfig, format: 'yaml' | 'typescript', outputPath?: string): Promise<string> {
    const cwd = this.#workingDirectory;

    let filePath: string;
    let content: string;

    if (format === 'typescript') {
      filePath = outputPath || join(cwd, 'stacktape.ts');
      const yamlContent = stringifyToYaml(config);
      const tsContent = convertYamlToTypescript(yamlContent);
      content = await prettier.format(tsContent, { parser: 'typescript', printWidth: 120, singleQuote: true });
    } else {
      filePath = outputPath || join(cwd, 'stacktape.yml');
      content = stringifyToYaml(config);
    }

    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  async configFileExists(): Promise<{ exists: boolean; path?: string }> {
    const cwd = this.#workingDirectory;
    const possiblePaths = [join(cwd, 'stacktape.yml'), join(cwd, 'stacktape.yaml'), join(cwd, 'stacktape.ts')];

    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        return { exists: true, path };
      }
    }

    return { exists: false };
  }

  // ============ Private Methods ============

  #reportProgress(callback: ConfigGenProgressCallback | undefined, info: ConfigGenPhaseInfo): void {
    this.#lastPhase = info.phase;
    if (callback) {
      callback(info);
    }
  }

  #throwIfCancelled(): void {
    if (this.#cancelled) {
      throw new ConfigGenError({ message: 'Config generation was cancelled', code: 'CANCELLED', retryable: false });
    }
  }

  #wrapApiError(error: unknown, phase: string): ConfigGenError {
    if (error instanceof ConfigGenError) return error;

    if (isNetworkError(error)) {
      return new ConfigGenError({
        message: 'Could not reach the Stacktape API. Check your internet connection and try again.',
        code: 'NETWORK',
        phase
      });
    }

    const rawMessage = error instanceof Error ? error.message : String(error);
    return new ConfigGenError({
      message: `Config generation failed during ${getPhaseDisplayName(phase).toLowerCase()}: ${rawMessage}`,
      code: 'SERVER',
      phase
    });
  }

  async #pollForResult(onProgress?: ConfigGenProgressCallback): Promise<ConfigGenResult> {
    const startTime = Date.now();
    let consecutiveFailures = 0;

    while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
      this.#throwIfCancelled();

      let session;
      try {
        session = await publicApiClient.getCliConfigGenState(this.#sessionId!);
        consecutiveFailures = 0;
      } catch (error) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          throw this.#wrapApiError(error, this.#lastPhase || 'ANALYZING_DEPLOYMENTS');
        }
        // Transient poll failure - wait and retry
        await this.#sleep(POLL_INTERVAL_MS * 2);
        continue;
      }

      const message = PHASE_MESSAGES[session.phase] || 'Processing...';
      this.#reportProgress(onProgress, {
        phase: session.phase,
        message,
        details: {
          deployableUnits: session.data.deployableUnits,
          requiredResources: session.data.requiredResources
        }
      });

      if (session.state === 'SUCCESS') {
        if (!session.data.config) {
          throw new ConfigGenError({
            message:
              'Analysis completed but no configuration was generated. The project structure may not be supported.',
            code: 'SERVER',
            phase: session.phase
          });
        }

        return {
          config: session.data.config,
          deployableUnits: session.data.deployableUnits || [],
          requiredResources: session.data.requiredResources || []
        };
      }

      if (session.state === 'ERROR') {
        const serverMessage = session.data.error?.message || '';
        throw new ConfigGenError({
          message: this.#humanizeServerError(serverMessage, session.phase),
          code: 'SERVER',
          phase: session.phase
        });
      }

      if (session.state === 'CANCELLED') {
        throw new ConfigGenError({ message: 'Config generation was cancelled', code: 'CANCELLED', retryable: false });
      }

      await this.#sleep(POLL_INTERVAL_MS);
    }

    throw new ConfigGenError({
      message:
        'Config generation is taking too long. This usually means the AI analysis is overloaded - please try again.',
      code: 'TIMEOUT',
      phase: this.#lastPhase || 'ANALYZING_DEPLOYMENTS'
    });
  }

  #humanizeServerError(serverMessage: string, phase: string): string {
    const lower = serverMessage.toLowerCase();

    if (lower.includes('lint') || lower.includes('todo_set')) {
      return 'Generated configuration had validation issues. Please try again - results may vary between attempts.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
      return 'AI service is currently rate-limited. Please wait a moment and try again.';
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return 'AI analysis timed out on the server. Please try again.';
    }

    if (!serverMessage) {
      return `Config generation failed during ${getPhaseDisplayName(phase).toLowerCase()}. Please try again.`;
    }

    return `Config generation failed: ${serverMessage}`;
  }

  #sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const configGenManager = new ConfigGenManager();
