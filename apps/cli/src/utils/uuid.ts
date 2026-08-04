import { generate } from 'short-uuid';
import uuid from 'uuid-random';

export const generateUuid = () => {
  return uuid();
};

export const generateShortUuid = () => {
  return generate();
};
