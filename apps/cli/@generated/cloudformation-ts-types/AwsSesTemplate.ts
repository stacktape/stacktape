// This file is auto-generated. Do not edit manually.
// Source: aws-ses-template.json

/** Resource Type definition for AWS::SES::Template */
export type AwsSesTemplate = {
  Id?: string;
  Template?: {
    /**
     * The name of the template.
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9_-]{1,64}$
     */
    TemplateName?: string;
    /** The subject line of the email. */
    SubjectPart: string;
    /** The email body that is visible to recipients whose email clients do not display HTML content. */
    TextPart?: string;
    /** The HTML body of the email. */
    HtmlPart?: string;
  };
};
