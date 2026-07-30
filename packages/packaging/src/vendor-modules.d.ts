/**
 * Types for the two untyped packaging dependencies, declared as narrowly as this package uses them.
 *
 * The CLI compiles these as `any` under its looser configuration; this package compiles under the
 * strict workspace `tsconfig.package.json`, so the shapes are stated here rather than suppressed.
 */

declare module 'cup-readdir' {
  /** Absolute paths of every file below `directoryPath`, recursively. */
  export function getAllFilePaths(directoryPath: string): Promise<string[]>;
}

declare module 'folder-hash' {
  export type HashElementOptions = {
    encoding?: 'hex' | 'base64' | 'binary' | undefined;
    folders?: { include?: string[] | undefined; exclude?: string[] } | undefined;
    files?: { include?: string[] | undefined; exclude?: string[] } | undefined;
  };

  export type HashElementResult = {
    name: string;
    hash: string;
    children?: HashElementResult[] | undefined;
  };

  export function hashElement(path: string, options?: HashElementOptions): Promise<HashElementResult> | undefined;
}

declare module 'ini' {
  /** Parses a Nixpacks TOML/INI-style configuration into nested JSON-compatible values. */
  export function parse(contents: string): Record<string, unknown>;
}
