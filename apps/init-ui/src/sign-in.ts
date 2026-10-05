/**
 * The rules of the sign-in panel that are not about rendering.
 *
 * Kept apart from the component so each can be checked with a table: what the form refuses before
 * it asks the CLI, how an organization is named, and where a forgotten password is reset.
 */

/** The Cognito user pool's own minimum. The hint under the field states this and nothing stricter. */
export const MIN_PASSWORD_LENGTH = 8;

export type SignInIntent = 'sign-up' | 'sign-in';

export type CredentialProblems = { email?: string; password?: string };

/**
 * What is wrong with the form as typed, so an obvious slip costs no round trip.
 *
 * Only what the sign-in service would certainly refuse. Whether a password is the right one, or an
 * address has an account, is the service's to say.
 */
export const checkCredentials = ({
  intent,
  email,
  password
}: {
  intent: SignInIntent;
  email: string;
  password: string;
}): CredentialProblems => {
  const problems: CredentialProblems = {};
  const address = email.trim();
  if (address === '') problems.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) problems.email = 'That does not look like an email address.';

  if (password === '') problems.password = intent === 'sign-up' ? 'Choose a password.' : 'Enter your password.';
  // An existing password is never judged by today's rule: the account may predate it.
  else if (intent === 'sign-up' && password.length < MIN_PASSWORD_LENGTH) {
    problems.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return problems;
};

/** Keeps the digits of a typed or pasted code, so "482 913" and "482-913" both work. */
export const digitsOfCode = (typed: string): string => typed.replace(/\D/g, '').slice(0, 6);

/**
 * An organization as a person would name it.
 *
 * Every account starts with one organization of its own, stored under a generated name ending in
 * `-personal-org`. `stacktape login` prints that one as "Personal", and so does the wizard.
 */
export const organizationLabel = (name: string): string => (name.endsWith('-personal-org') ? 'Personal' : name);

/** Where a forgotten password is reset. The Console owns that flow; the wizard links to it. */
export const passwordResetUrl = (email: string): string => {
  const address = email.trim();
  return `https://console.stacktape.com/reset-password${address === '' ? '' : `?email=${encodeURIComponent(address)}`}`;
};
