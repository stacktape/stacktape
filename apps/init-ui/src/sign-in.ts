/**
 * The rules of the sign-in panel that are not about rendering, kept apart from the component so each can be checked
 * with a table.
 */

/**
 * An organization as a person would name it.
 *
 * Every account starts with one organization of its own, stored under a generated name ending in `-personal-org`.
 * `stacktape login` prints that one as "Personal", and so does the wizard.
 */
export const organizationLabel = (name: string): string => (name.endsWith('-personal-org') ? 'Personal' : name);

/**
 * Whether an address the CLI handed over may be opened in a new tab: the Console's device page over https, or a
 * loopback stand-in for it over http. Anything else (a `javascript:` URL, another scheme) is never opened.
 */
export const isOpenableSignInAddress = (address: string): boolean => {
  try {
    const url = new URL(address);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  } catch {
    return false;
  }
};
