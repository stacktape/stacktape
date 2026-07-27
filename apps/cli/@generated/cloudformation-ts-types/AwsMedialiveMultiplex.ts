// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-multiplex.json

/** Resource schema for AWS::MediaLive::Multiplex */
export type AwsMedialiveMultiplex = {
  /** The unique arn of the multiplex. */
  Arn?: string;
  /** A list of availability zones for the multiplex. */
  AvailabilityZones: string[];
  /** A list of the multiplex output destinations. */
  Destinations?: {
    /** Multiplex MediaConnect output destination settings. */
    MultiplexMediaConnectOutputDestinationSettings?: unknown;
  }[];
  /** The unique id of the multiplex. */
  Id?: string;
  /** Configuration for a multiplex event. */
  MultiplexSettings: {
    /**
     * Maximum video buffer delay in milliseconds.
     * @minimum 800
     * @maximum 3000
     */
    MaximumVideoBufferDelayMilliseconds?: number;
    /**
     * Transport stream bit rate.
     * @minimum 1000000
     * @maximum 100000000
     */
    TransportStreamBitrate: number;
    /**
     * Transport stream ID.
     * @minimum 0
     * @maximum 65535
     */
    TransportStreamId: number;
    /**
     * Transport stream reserved bit rate.
     * @minimum 0
     * @maximum 100000000
     */
    TransportStreamReservedBitrate?: number;
  };
  /** Name of multiplex. */
  Name: string;
  /** The number of currently healthy pipelines. */
  PipelinesRunningCount?: number;
  /** The number of programs in the multiplex. */
  ProgramCount?: number;
  /** @enum ["CREATING","CREATE_FAILED","IDLE","STARTING","RUNNING","RECOVERING","STOPPING","DELETING","DELETED"] */
  State?: "CREATING" | "CREATE_FAILED" | "IDLE" | "STARTING" | "RUNNING" | "RECOVERING" | "STOPPING" | "DELETING" | "DELETED";
  /** A collection of key-value pairs. */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
