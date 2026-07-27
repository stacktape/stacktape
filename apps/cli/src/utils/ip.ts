import { jsonFetch } from './http-client';

export const getIpAddress = async () => {
  const res = await jsonFetch('https://api.ipify.org?format=json');
  return res.ip;
};
