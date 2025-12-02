// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-clientcertificate.json

/**
 * The ``AWS::ApiGateway::ClientCertificate`` resource creates a client certificate that API Gateway
 * uses to configure client-side SSL authentication for sending requests to the integration endpoint.
 */
export type AwsApigatewayClientcertificate = {
  ClientCertificateId?: string;
  Description?: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     */
    Key: string;
    /** The value for the specified tag key. */
    Value: string;
  }[];
};
