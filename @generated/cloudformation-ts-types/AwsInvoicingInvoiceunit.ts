// This file is auto-generated. Do not edit manually.
// Source: aws-invoicing-invoiceunit.json

/**
 * An invoice unit is a set of mutually exclusive accounts that correspond to your business entity.
 * Invoice units allow you to separate AWS account costs and configures your invoice for each business
 * entity.
 */
export type AwsInvoicingInvoiceunit = {
  InvoiceUnitArn?: string;
  InvoiceReceiver: string;
  Name: string;
  Description?: string;
  TaxInheritanceDisabled?: boolean;
  Rule: {
    LinkedAccounts: string[];
  };
  LastModified?: number;
  ResourceTags?: {
    /**
     * @minLength 1
     * @maxLength 256
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 200
     */
    Value: string;
  }[];
};
