/**
 * AWS SES (Simple Email Service) reference for connectTo
 * Grants full permissions for AWS SES (ses:*)
 */
export const AWS_SES = 'aws:ses' as const;

/**
 * Type that represents any AWS service constant
 */
export type GlobalAwsServiceConstant = typeof AWS_SES;
