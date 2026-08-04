export const shortHash = (text: string) => {
  let hash = 5381;
  let index = text.length;

  while (index) {
    hash = (hash * 33) ^ text.charCodeAt(--index);
  }

  return (hash >>> 0).toString(16);
};
