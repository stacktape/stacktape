import { publicApiClient } from '@shared/trpc/public';
import { convertYamlToTypescript } from '@shared/utils/config-converter';
import { stringifyToYaml } from '@shared/utils/yaml';
import { writeFile, pathExists } from 'fs-extra';
import { join } from 'node:path';
import type { CliConfigGenSession } from '@shared/trpc/public';
import type { ConfigGenProgressCallback, ConfigGenResult, ConfigGenPhaseInfo } from './types';
import {
  listAllFilesInDirectory,
  getPrettyPrintedFiles,
  tryGetContentTruncated,
  DEFAULT_IGNORE_PATTERNS
} from './file-scanner';

export { listAllFilesInDirectory, getPrettyPrintedFiles, tryGetContentTruncated, DEFAULT_IGNORE_PATTERNS };
export * from './types';

// ============ Constants ============

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 120; // 60 seconds max

// ============ Phase Messages ============

const PHASE_MESSAGES: Record<string, string> = {
  FILE_SELECTION: 'Analyzing project structure...',
  WAITING_FOR_FILE_CONTENTS: 'Reading selected files...',
  ANALYZING_DEPLOYMENTS: 'Identifying deployable units...',
  GENERATING_CONFIG: 'Generating Stacktape configuration...',
  ADJUSTING_ENV_VARS: 'Configuring environment variables...'
};

// ============ Config Gen Manager ============

export class ConfigGenManager {
  #sessionId: string | null = null;
  #cancelled = false;
  #workingDirectory: string = process.cwd();

  /**
   * Set the working directory for config generation.
   * If not set, defaults to process.cwd().
   */
  setWorkingDirectory(dir: string): void {
    this.#workingDirectory = dir;
  }

  /**
   * Generate a Stacktape configuration for the working directory.
   *
   * @param onProgress - Optional callback for progress updates
   * @returns The generated configuration and metadata
   */
  async generate(onProgress?: ConfigGenProgressCallback): Promise<ConfigGenResult> {
    const cwd = this.#workingDirectory;
    this.#cancelled = false;

    // Initialize the API client
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

    if (this.#cancelled) {
      throw new Error('Config generation was cancelled');
    }

    const fileTree = getPrettyPrintedFiles(allFiles);

    this.#reportProgress(onProgress, {
      phase: 'FILE_SELECTION',
      message: 'Analyzing project structure...',
      details: { totalFiles: allFiles.length }
    });

    // Phase 2: Start server session (AI selects files)
    const { sessionId, filesToRead } = await publicApiClient.startCliConfigGen({
      fileTree,
      allFiles
    });

    this.#sessionId = sessionId;

    if (this.#cancelled) {
      await this.cancel();
      throw new Error('Config generation was cancelled');
    }

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
      if (this.#cancelled) {
        await this.cancel();
        throw new Error('Config generation was cancelled');
      }

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

    await publicApiClient.submitCliConfigGenFiles({
      sessionId,
      files: fileContents
    });

    // Phase 5: Poll for result
    const result = await this.#pollForResult(onProgress);

    return result;
  }

  /**
   * Cancel the current config generation.
   */
  async cancel(): Promise<void> {
    this.#cancelled = true;
    if (this.#sessionId) {
      try {
        await publicApiClient.cancelCliConfigGen(this.#sessionId);
      } catch {
        // Ignore errors when cancelling
      }
      this.#sessionId = null;
    }
  }

  /**
   * Write the generated config to a file.
   *
   * @param config - The Stacktape configuration
   * @param format - Output format ('yaml' or 'typescript')
   * @param outputPath - Optional custom output path
   * @returns The path where the file was written
   */
  async writeConfig(
    config: StacktapeConfig,
    format: 'yaml' | 'typescript',
    outputPath?: string
  ): Promise<string> {
    const cwd = process.cwd();

    let filePath: string;
    let content: string;

    if (format === 'typescript') {
      filePath = outputPath || join(cwd, 'stacktape.ts');
      // Convert config object to YAML first, then to TypeScript
      const yamlContent = stringifyToYaml(config);
      content = convertYamlToTypescript(yamlContent);
    } else {
      filePath = outputPath || join(cwd, 'stacktape.yml');
      content = stringifyToYaml(config);
    }

    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Check if a stacktape config file already exists.
   */
  async configFileExists(): Promise<{ exists: boolean; path?: string }> {
    const cwd = process.cwd();
    const possiblePaths = [
      join(cwd, 'stacktape.yml'),
      join(cwd, 'stacktape.yaml'),
      join(cwd, 'stacktape.ts')
    ];

    for (const path of possiblePaths) {
      if (await pathExists(path)) {
        return { exists: true, path };
      }
    }

    return { exists: false };
  }

  // ============ Private Methods ============

  #reportProgress(callback: ConfigGenProgressCallback | undefined, info: ConfigGenPhaseInfo): void {
    if (callback) {
      callback(info);
    }
  }

  async #pollForResult(onProgress?: ConfigGenProgressCallback): Promise<ConfigGenResult> {
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      if (this.#cancelled) {
        throw new Error('Config generation was cancelled');
      }

      const session = await publicApiClient.getCliConfigGenState(this.#sessionId!);

      // Update progress
      const message = PHASE_MESSAGES[session.phase] || 'Processing...';
      this.#reportProgress(onProgress, {
        phase: session.phase,
        message
      });

      // Check final states
      if (session.state === 'SUCCESS') {
        if (!session.data.config) {
          throw new Error('Server returned success but no config was generated');
        }

        return {
          config: session.data.config,
          deployableUnits: session.data.deployableUnits || [],
          requiredResources: session.data.requiredResources || []
        };
      }

      if (session.state === 'ERROR') {
        const errorMessage = session.data.error?.message || 'Unknown error occurred during config generation';
        throw new Error(errorMessage);
      }

      if (session.state === 'CANCELLED') {
        throw new Error('Config generation was cancelled');
      }

      // Wait before next poll
      await this.#sleep(POLL_INTERVAL_MS);
      attempts++;
    }

    throw new Error('Config generation timed out. Please try again.');
  }

  #sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance of the config generator.
 */
export const configGenManager = new ConfigGenManager();
