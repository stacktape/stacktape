// This file is auto-generated. Do not edit manually.
// Source: aws-mediatailor-vodsource.json

/** Definition of AWS::MediaTailor::VodSource Resource Type */
export type AwsMediatailorVodsource = {
  /** <p>The ARN of the VOD source.</p> */
  Arn?: string;
  /** <p>A list of HTTP package configuration parameters for this VOD source.</p> */
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
  SourceLocationName: string;
  /**
   * The tags to assign to the VOD source.
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  VodSourceName: string;
};
