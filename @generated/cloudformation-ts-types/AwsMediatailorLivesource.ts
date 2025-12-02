// This file is auto-generated. Do not edit manually.
// Source: aws-mediatailor-livesource.json

/** Definition of AWS::MediaTailor::LiveSource Resource Type */
export type AwsMediatailorLivesource = {
  /** <p>The ARN of the live source.</p> */
  Arn?: string;
  /** <p>A list of HTTP package configuration parameters for this live source.</p> */
  HttpPackageConfigurations: ({
    /**
     * <p>The relative path to the URL for this VOD source. This is combined with
     * <code>SourceLocation::HttpConfiguration::BaseUrl</code> to form a valid URL.</p>
     */
    Path: string;
    /**
     * <p>The name of the source group. This has to match one of the
     * <code>Channel::Outputs::SourceGroup</code>.</p>
     */
    SourceGroup: string;
    Type: "DASH" | "HLS";
  })[];
  LiveSourceName: string;
  SourceLocationName: string;
  /**
   * The tags to assign to the live source.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
