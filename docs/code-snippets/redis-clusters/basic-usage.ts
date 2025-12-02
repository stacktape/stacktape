import { Redis } from 'ioredis';

const redisClient = new Redis(process.env.STP_MY_REDIS_CLUSTER_CONNECTION_STRING);

const handler = async (event, context) => {
  await redisClient.set('currentTime', `${Date.now()}`);

  const value = await redisClient.get('currentTime');

  return { result: value };
};

export default handler;
