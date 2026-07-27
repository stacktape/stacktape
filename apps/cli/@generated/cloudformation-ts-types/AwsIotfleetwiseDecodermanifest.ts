// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-decodermanifest.json

/** Definition of AWS::IoTFleetWise::DecoderManifest Resource Type */
export type AwsIotfleetwiseDecodermanifest = {
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[^\u0000-\u001F\u007F]+$
   */
  Description?: string;
  LastModificationTime?: string;
  ModelManifestArn: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z\d\-_:]+$
   */
  Name: string;
  /**
   * @minItems 1
   * @maxItems 5000
   */
  NetworkInterfaces?: ({
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    /** @enum ["CAN_INTERFACE"] */
    Type: "CAN_INTERFACE";
    CanInterface: {
      /**
       * @minLength 1
       * @maxLength 100
       */
      Name: string;
      /**
       * @minLength 1
       * @maxLength 50
       */
      ProtocolName?: string;
      /**
       * @minLength 1
       * @maxLength 50
       */
      ProtocolVersion?: string;
    };
  } | {
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    /** @enum ["OBD_INTERFACE"] */
    Type: "OBD_INTERFACE";
    ObdInterface: {
      /**
       * @minLength 1
       * @maxLength 100
       */
      Name: string;
      RequestMessageId: number | string;
      /**
       * @minLength 1
       * @maxLength 50
       */
      ObdStandard?: string;
      PidRequestIntervalSeconds?: number | string;
      DtcRequestIntervalSeconds?: number | string;
      UseExtendedIds?: boolean | string;
      HasTransmissionEcu?: boolean | string;
    };
  } | {
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    /** @enum ["CUSTOM_DECODING_INTERFACE"] */
    Type: "CUSTOM_DECODING_INTERFACE";
    CustomDecodingInterface: {
      /**
       * @minLength 1
       * @maxLength 100
       * @pattern ^[a-zA-Z\d\-_:]+$
       */
      Name: string;
    };
  })[];
  /**
   * @minItems 1
   * @maxItems 5000
   */
  SignalDecoders?: ({
    /**
     * @minLength 1
     * @maxLength 150
     */
    FullyQualifiedName: string;
    /** @enum ["CAN_SIGNAL"] */
    Type: "CAN_SIGNAL";
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    CanSignal: {
      MessageId: number | string;
      IsBigEndian: boolean | string;
      IsSigned: boolean | string;
      StartBit: number | string;
      Offset: number | string;
      Factor: number | string;
      Length: number | string;
      /**
       * @minLength 1
       * @maxLength 100
       */
      Name?: string;
      SignalValueType?: "INTEGER" | "FLOATING_POINT";
    };
  } | {
    /**
     * @minLength 1
     * @maxLength 150
     */
    FullyQualifiedName: string;
    /** @enum ["OBD_SIGNAL"] */
    Type: "OBD_SIGNAL";
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    ObdSignal: {
      PidResponseLength: number | string;
      ServiceMode: number | string;
      Pid: number | string;
      Scaling: number | string;
      Offset: number | string;
      StartByte: number | string;
      ByteLength: number | string;
      BitRightShift?: number | string;
      BitMaskLength?: number | string;
      IsSigned?: boolean | string;
      SignalValueType?: "INTEGER" | "FLOATING_POINT";
    };
  } | {
    /**
     * @minLength 1
     * @maxLength 150
     */
    FullyQualifiedName: string;
    /** @enum ["CUSTOM_DECODING_SIGNAL"] */
    Type: "CUSTOM_DECODING_SIGNAL";
    /**
     * @minLength 1
     * @maxLength 50
     */
    InterfaceId: string;
    CustomDecodingSignal: {
      /**
       * @minLength 1
       * @maxLength 150
       * @pattern ^(?!.*\.\.)[a-zA-Z0-9_\-#:.]+$
       */
      Id: string;
    };
  })[];
  Status?: "ACTIVE" | "DRAFT";
  DefaultForUnmappedSignals?: "CUSTOM_DECODING";
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
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
};
