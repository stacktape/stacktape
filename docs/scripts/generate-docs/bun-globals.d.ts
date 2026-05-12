interface ImportMeta {
  readonly dir: string;
  readonly main?: boolean;
}

declare const Bun: {
  which(command: string): string | null;
  spawn(options: {
    cmd: string[];
    cwd?: string;
    stdin?: Blob | 'ignore';
    stdout?: 'pipe' | 'inherit' | 'ignore';
    stderr?: 'pipe' | 'inherit' | 'ignore';
  }): {
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    exited: Promise<number>;
  };
};
