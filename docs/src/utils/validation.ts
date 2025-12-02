import isEmailValid from 'validator/lib/isEmail';

export const isValidEmail = (value: string): string | true => {
  if (!isEmailValid(value || '')) {
    return 'Must be a valid email';
  }
  return true;
};
