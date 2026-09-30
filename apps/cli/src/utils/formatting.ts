export const normalizePathForLink = (path: string) => {
  if (path === '*') {
    return '/*';
  }
  return path;
};
