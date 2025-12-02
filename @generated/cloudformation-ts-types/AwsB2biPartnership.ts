// This file is auto-generated. Do not edit manually.
// Source: aws-b2bi-partnership.json

/** Definition of AWS::B2BI::Partnership Resource Type */
export type AwsB2biPartnership = {
  Capabilities: string[];
  CapabilityOptions?: {
    OutboundEdi?: {
      X12: {
        Common?: {
          InterchangeControlHeaders?: {
            /**
             * @minLength 2
             * @maxLength 2
             * @pattern ^[a-zA-Z0-9]*$
             */
            SenderIdQualifier?: string;
            /**
             * @minLength 15
             * @maxLength 15
             * @pattern ^[a-zA-Z0-9 ]*$
             */
            SenderId?: string;
            /**
             * @minLength 2
             * @maxLength 2
             * @pattern ^[a-zA-Z0-9]*$
             */
            ReceiverIdQualifier?: string;
            /**
             * @minLength 15
             * @maxLength 15
             * @pattern ^[a-zA-Z0-9 ]*$
             */
            ReceiverId?: string;
            /**
             * @minLength 1
             * @maxLength 1
             */
            RepetitionSeparator?: string;
            /**
             * @minLength 1
             * @maxLength 1
             * @pattern ^[a-zA-Z0-9]*$
             */
            AcknowledgmentRequestedCode?: string;
            /**
             * @minLength 1
             * @maxLength 1
             * @pattern ^[a-zA-Z0-9]*$
             */
            UsageIndicatorCode?: string;
          };
          FunctionalGroupHeaders?: {
            /**
             * @minLength 2
             * @maxLength 15
             * @pattern ^[a-zA-Z0-9 ]*$
             */
            ApplicationSenderCode?: string;
            /**
             * @minLength 2
             * @maxLength 15
             * @pattern ^[a-zA-Z0-9 ]*$
             */
            ApplicationReceiverCode?: string;
            /**
             * @minLength 1
             * @maxLength 2
             * @pattern ^[a-zA-Z0-9]*$
             */
            ResponsibleAgencyCode?: string;
          };
          Delimiters?: {
            /**
             * @minLength 1
             * @maxLength 1
             * @pattern ^[!&'()*+,\-./:;?=%@\[\]_{}|<>~^`"]$
             */
            ComponentSeparator?: string;
            /**
             * @minLength 1
             * @maxLength 1
             * @pattern ^[!&'()*+,\-./:;?=%@\[\]_{}|<>~^`"]$
             */
            DataElementSeparator?: string;
            /**
             * @minLength 1
             * @maxLength 1
             * @pattern ^[!&'()*+,\-./:;?=%@\[\]_{}|<>~^`"]$
             */
            SegmentTerminator?: string;
          };
          ValidateEdi?: boolean;
          ControlNumbers?: {
            /**
             * @minimum 1
             * @maximum 999999999
             */
            StartingInterchangeControlNumber?: number;
            /**
             * @minimum 1
             * @maximum 999999999
             */
            StartingFunctionalGroupControlNumber?: number;
            /**
             * @minimum 1
             * @maximum 999999999
             */
            StartingTransactionSetControlNumber?: number;
          };
          Gs05TimeFormat?: "HHMM" | "HHMMSS" | "HHMMSSDD";
        };
        WrapOptions?: {
          WrapBy?: "SEGMENT" | "ONE_LINE" | "LINE_LENGTH";
          LineTerminator?: "CRLF" | "LF" | "CR";
          /** @minimum 1 */
          LineLength?: number;
        };
      };
    };
    InboundEdi?: {
      X12?: {
        AcknowledgmentOptions?: {
          FunctionalAcknowledgment: "DO_NOT_GENERATE" | "GENERATE_ALL_SEGMENTS" | "GENERATE_WITHOUT_TRANSACTION_SET_RESPONSE_LOOP";
          TechnicalAcknowledgment: "DO_NOT_GENERATE" | "GENERATE_ALL_SEGMENTS";
        };
      };
    };
  };
  CreatedAt?: string;
  /**
   * @minLength 5
   * @maxLength 254
   * @pattern ^[\w\.\-]+@[\w\.\-]+$
   */
  Email: string;
  ModifiedAt?: string;
  /**
   * @minLength 1
   * @maxLength 254
   */
  Name: string;
  /**
   * @minLength 1
   * @maxLength 255
   */
  PartnershipArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  PartnershipId?: string;
  /**
   * @minLength 7
   * @maxLength 22
   * @pattern ^\+?([0-9 \t\-()\/]{7,})(?:\s*(?:#|x\.?|ext\.?|extension) \t*(\d+))?$
   */
  Phone?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ProfileId: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  TradingPartnerId?: string;
};
