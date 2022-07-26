/* eslint-disable promise/catch-or-return */
// 1. we create multiple sockets (to force load balancing) and wait for them to connect
// 2. we choose one socket to send message - after, the socket gracefully disconnects
// 3. rest of the sockets receive the message - after, each socket gracefully disconnects
import ioClient, { Socket } from 'socket.io-client';

const disconnectSocket = (socket: Socket) => {
  console.info(`socket ${socket.id} - disconnecting...`);
  socket.disconnect();
};

const createSocketConnection = (): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://${process.env.LOAD_BALANCER_DOMAIN}`, {
      path: '/websockets',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.info(`socket ${socket.id} - connected`);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      console.info('socket failed to connect');
      reject(err);
    });

    socket.on('message-from-client', (msg) => {
      console.info(`socket ${socket.id} - received message: ${msg}`);
      // after socket receives message it will gracefully disconnect
      disconnectSocket(socket);
    });
  });
};

const AMOUNT_OF_CONNECTIONS = 100;

// create 100 connections and then emit a message to all of them
Promise.all(Array.from({ length: AMOUNT_OF_CONNECTIONS }).map(createSocketConnection)).then((sockets) => {
  // chose first socket as sender and send message
  const socket = sockets[0];
  socket.emit('message-from-client', `hello message from ${socket.id}`);
  console.info(`socket ${socket.id} - emitted hello message.`);

  disconnectSocket(socket);
});
