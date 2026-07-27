// This file is auto-generated. Do not edit manually.
// Source: aws-cloudwatch-anomalydetector.json

/** Resource Type definition for AWS::CloudWatch::AnomalyDetector */
export type AwsCloudwatchAnomalydetector = {
  MetricCharacteristics?: {
    PeriodicSpikes?: boolean;
  };
  MetricName?: string;
  Stat?: string;
  Configuration?: {
    MetricTimeZone?: string;
    /** @uniqueItems false */
    ExcludedTimeRanges?: {
      EndTime: string;
      StartTime: string;
    }[];
  };
  MetricMathAnomalyDetector?: {
    /** @uniqueItems false */
    MetricDataQueries?: {
      AccountId?: string;
      ReturnData?: boolean;
      Expression?: string;
      MetricStat?: {
        Period: number;
        Metric: {
          MetricName: string;
          /** @uniqueItems false */
          Dimensions?: {
            Value: string;
            Name: string;
          }[];
          Namespace: string;
        };
        Stat: string;
        Unit?: string;
      };
      Label?: string;
      Period?: number;
      Id: string;
    }[];
  };
  /** @uniqueItems false */
  Dimensions?: {
    Value: string;
    Name: string;
  }[];
  Id?: string;
  Namespace?: string;
  SingleMetricAnomalyDetector?: {
    MetricName?: string;
    /** @uniqueItems false */
    Dimensions?: {
      Value: string;
      Name: string;
    }[];
    AccountId?: string;
    Stat?: string;
    Namespace?: string;
  };
};
