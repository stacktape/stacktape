import { raiseError } from './misc';

export const validateEnvVariableValue = (propertyName: string, value: any) => {
  const type = typeof value;
  if (!['number', 'string', 'boolean'].includes(type)) {
    raiseError({
      type: 'CONFIG',
      message: `Environment variable '${propertyName}' has unsupported type '${type}'. Only primitive types (string, number) are supported.`,
      hint: 'If you want to pass object to an environment variable, you can stringify it using $JsonStringify() directive.'
    });
  }
};

export const isEmailValid = (email: string) => {
  const re =
    // eslint-disable-next-line
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\v\f\x0E-\x1F\x21\x23-\x5B\x5D-\x7F]|\\[\x01-\x09\v\f\x0E-\x7F])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(2(5[0-5]|[0-4]\d)|1\d\d|[1-9]?\d)\.){3}(?:(2(5[0-5]|[0-4]\d)|1\d\d|[1-9]?\d)|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\v\f\x0E-\x1F\x21-\x5A\x53-\x7F]|\\[\x01-\x09\v\f\x0E-\x7F])+)\])/;
  return re.test(email);
};
