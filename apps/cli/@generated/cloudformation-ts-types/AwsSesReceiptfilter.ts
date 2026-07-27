// This file is auto-generated. Do not edit manually.
// Source: aws-ses-receiptfilter.json

/** Resource Type definition for AWS::SES::ReceiptFilter */
export type AwsSesReceiptfilter = {
  Id?: string;
  Filter: {
    IpFilter: {
      Policy: string;
      Cidr: string;
    };
    Name?: string;
  };
};
