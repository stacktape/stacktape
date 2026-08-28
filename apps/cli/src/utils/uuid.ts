import { randomUUID } from 'node:crypto';

const SHORT_UUID_ALPHABET = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const SHORT_UUID_BASE = BigInt(SHORT_UUID_ALPHABET.length);

// Preserve short-uuid's historical Flickr Base58 alphabet and fixed width so invocation IDs keep their public shape.
const shortenUuid = (uuid: string) => {
  let value = BigInt(`0x${uuid.replaceAll('-', '')}`);
  let shortened = '';
  while (value > BigInt(0)) {
    shortened = SHORT_UUID_ALPHABET[Number(value % SHORT_UUID_BASE)] + shortened;
    value /= SHORT_UUID_BASE;
  }
  return shortened.padStart(22, SHORT_UUID_ALPHABET[0]);
};

export const generateUuid = () => {
  return randomUUID();
};

export const generateShortUuid = () => {
  return shortenUuid(randomUUID());
};
