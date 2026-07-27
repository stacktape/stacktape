import * as net from 'node:net';

const checkPortOnHost = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, host, () => {
      server.close();
      resolve(false); // Port is free
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

  // Check both 0.0.0.0 and 127.0.0.1 since Docker binds to 0.0.0.0 by default
  const [inUseOnAll, inUseOnLocalhost] = await Promise.all([
    checkPortOnHost(port, '0.0.0.0'),
    checkPortOnHost(port, '127.0.0.1')
  ]);

  return inUseOnAll || inUseOnLocalhost;
};
