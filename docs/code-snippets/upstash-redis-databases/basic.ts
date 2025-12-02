import upstash from '@upstash/redis';

const redis = upstash({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async (event) => {
  // write data
  let { data, error } = await redis.set('key1', 'value1');

  // read data
  ({ data, error } = await redis.get('key1'));
  console.log(data);

  if (error) {
    throw error;
  }
};
