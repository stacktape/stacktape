/** A user directive: upper-cases its argument and appends the stage it was resolved for. */
export const shout = (value: string, suffix = '') => `${String(value).toUpperCase()}${suffix}`;

/** A user directive that fails, to prove the error reaches the user with the directive name and no config values. */
export const broken = () => {
  throw new Error('directive handler exploded');
};
