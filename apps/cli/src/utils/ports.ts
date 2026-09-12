import * as net from 'node:net';

const checkPortOnHost = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, host, () => {
      server.close(() => resolve(false)); // Release the probe before checking another host or starting a tunnel.
    });

    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
};

/**
 * Check if port is in use. Checks both 0.0.0.0 and 127.0.0.1 to handle
 * Docker containers that bind to 0.0.0.0 (which may not conflict with 127.0.0.1 on some OSes).
 */
export const isPortInUse = async (port: number, host?: string): Promise<boolean> => {
  // If specific host provided, check only that host
  if (host) {
    return checkPortOnHost(port, host);
  }

  // These binds overlap on Linux. Parallel probes can mistake each other for an existing listener.
  if (await checkPortOnHost(port, '0.0.0.0')) return true;
  return checkPortOnHost(port, '127.0.0.1');
};
