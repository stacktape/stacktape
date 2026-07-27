import { createServer } from 'http';
import os from 'os';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import express from 'express';

const interfaces = os.networkInterfaces();
const internalIpAddressOfContainer = Object.values(interfaces).flat().find((i) => i && !i.internal && i.family === 'IPv4')?.address || 'unknown';

// create Socket.io server with express according to https://socket.io/docs/v4/server-initialization/#with-express
const app = express();
// load balancer healthcheck requires HTTP route
app.use('/', async (_req, res) => {
  res.status(200).send('all good');
});
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/websockets'
});

io.on('connection', (socket) => {
  console.info(`Socket with id ${socket.id} connected to the container with IP ${internalIpAddressOfContainer}`);
  // every incoming "message-from-client" is broadcasted to all connected sockets (except the sender)
  socket.on('message-from-client', (msg) => {
    socket.broadcast.emit('message-from-client', msg);
  });
});

// create Redis pub and sub clients
const redisUrl = process.env.STP_REDIS_CONNECTION_STRING || `redis://${process.env.STP_REDIS_HOST}:${process.env.STP_REDIS_PORT || '6379'}`;
const pubClient = createClient({ url: redisUrl });
pubClient.on('error', console.error);
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    httpServer.listen(Number(process.env.PORT));
  })
  .catch((err) => {
    console.error(`Failed to initialize the Websocket server. Error: ${err.message}`);
  });
