import * as net from 'node:net';

export const isPortInUse = (port: number, host = '127.0.0.1'): Promise<boolean> => {
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
