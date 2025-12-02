// This file is auto-generated. Do not edit manually.
// Source: aws-appsync-channelnamespace.json

/** Resource schema for AppSync ChannelNamespace */
export type AwsAppsyncChannelnamespace = {
  /** AppSync Api Id that this Channel Namespace belongs to. */
  ApiId: string;
  Name: string;
  /** List of AuthModes supported for Subscribe operations. */
  SubscribeAuthModes?: ({
    AuthType?: "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "API_KEY" | "OPENID_CONNECT" | "AWS_LAMBDA";
  })[];
  /** List of AuthModes supported for Publish operations. */
  PublishAuthModes?: ({
    AuthType?: "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "API_KEY" | "OPENID_CONNECT" | "AWS_LAMBDA";
  })[];
  CodeHandlers?: string;
  /** The Amazon S3 endpoint where the code is located. */
  CodeS3Location?: string;
  ChannelNamespaceArn?: string;
  Tags?: {
    /**
     * A string used to identify this tag. You can specify a maximum of 128 characters for a tag key.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[ a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * A string containing the value for this tag. You can specify a maximum of 256 characters for a tag
     * value.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[\s\w+-=\.:/@]*$
     */
    Value: string;
  }[];
  HandlerConfigs?: {
    OnPublish?: {
      Behavior: "CODE" | "DIRECT";
      Integration: {
        /**
         * Data source to invoke for this integration.
         * @minLength 1
         * @maxLength 512
         * @pattern ([_A-Za-z][_0-9A-Za-z]{0,511})?
         */
        DataSourceName: string;
        LambdaConfig?: {
          InvokeType: "REQUEST_RESPONSE" | "EVENT";
        };
      };
    };
    OnSubscribe?: {
      Behavior: "CODE" | "DIRECT";
      Integration: {
        /**
         * Data source to invoke for this integration.
         * @minLength 1
         * @maxLength 512
         * @pattern ([_A-Za-z][_0-9A-Za-z]{0,511})?
         */
        DataSourceName: string;
        LambdaConfig?: {
          InvokeType: "REQUEST_RESPONSE" | "EVENT";
        };
      };
    };
  };
};
