import { Cluster } from 'ioredis';

const redisClusterClient = new Cluster(
  [
    {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT)
    }
  ],
  {
    redisOptions: { tls: {}, password: process.env.REDIS_PASSWORD },
    dnsLookup: (address, callback) => callback(null, address)
  }
);

const handler = async (event, context) => {
  await redisClusterClient.set('currentTime', `${Date.now()}`);

  const value = await redisClusterClient.get('currentTime');

  return { result: value };
};

export default handler;
