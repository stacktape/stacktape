import { snakeCase } from 'change-case';

/** The variable `connectTo` injects for a parameter of another resource. No Node imports: the Console's browser code reads it too. */
export const injectedParameterEnvVarName = (stpResourceReference: string, parameterName: string) =>
  snakeCase(`STP_${stpResourceReference.replaceAll('.', '_')}_${parameterName}`).toUpperCase();
