export const truncateText = (value: string, maxLen: number): string => {
  if (maxLen < 4) return value.slice(0, Math.max(0, maxLen));
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
};

export const truncateUrlForDisplay = (url: string, maxLen: number): string => {
  if (url.length <= maxLen) return url;
  if (maxLen < 10) return truncateText(url, maxLen);
  const tailLen = Math.min(10, Math.max(5, Math.floor(maxLen / 3)));
  const headLen = Math.max(1, maxLen - tailLen - 1);
  return `${url.slice(0, headLen)}…${url.slice(-tailLen)}`;
};

export const isHttpUrl = (value: string): boolean => value.startsWith('http://') || value.startsWith('https://');

export const formatTimestamp = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};
