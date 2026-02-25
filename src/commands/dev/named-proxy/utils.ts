export const isErrnoException = (err: unknown): err is NodeJS.ErrnoException => {
  return err instanceof Error && 'code' in err && typeof (err as Record<string, unknown>).code === 'string';
};

export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const formatUrl = (hostname: string, proxyPort: number, tls = false): string => {
  const protocol = tls ? 'https' : 'http';
  const defaultPort = tls ? 443 : 80;
  return proxyPort === defaultPort ? `${protocol}://${hostname}` : `${protocol}://${hostname}:${proxyPort}`;
};

export const parseHostname = (input: string): string => {
  let hostname = input
    .trim()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .toLowerCase();

  if (!hostname || hostname === '.localhost') {
    throw new Error('Hostname cannot be empty');
  }

  if (!hostname.endsWith('.localhost')) {
    hostname = `${hostname}.localhost`;
  }

  const name = hostname.replace(/\.localhost$/, '');
  if (name.includes('..')) {
    throw new Error(`Invalid hostname "${name}": consecutive dots are not allowed`);
  }
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(name)) {
    throw new Error(`Invalid hostname "${name}": must contain only lowercase letters, digits, hyphens, and dots`);
  }

  return hostname;
};

const FRAMEWORKS_NEEDING_PORT: Record<string, { strictPort: boolean }> = {
  vite: { strictPort: true },
  'react-router': { strictPort: true },
  astro: { strictPort: false },
  ng: { strictPort: false }
};

export const injectFrameworkFlags = (commandArgs: string[], port: number): void => {
  const cmd = commandArgs[0];
  if (!cmd) return;

  const normalizedCmd = cmd.replace(/\.(cmd|exe)$/i, '');
  const basename = normalizedCmd.split(/[/\\]/).pop() || normalizedCmd;
  const framework = FRAMEWORKS_NEEDING_PORT[basename];
  if (!framework) return;

  if (!commandArgs.includes('--port')) {
    commandArgs.push('--port', port.toString());
    if (framework.strictPort) {
      commandArgs.push('--strictPort');
    }
  }

  if (!commandArgs.includes('--host')) {
    commandArgs.push('--host', '127.0.0.1');
  }
};
