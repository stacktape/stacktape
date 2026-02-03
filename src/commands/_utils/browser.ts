import open from 'open';

/**
 * Opens a URL in the default browser
 */
export const openBrowser = (url: string) => {
  return open(url);
};
