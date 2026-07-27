// This file is auto-generated. Do not edit manually.
// Source: aws-resourceexplorer2-defaultviewassociation.json

/** Definition of AWS::ResourceExplorer2::DefaultViewAssociation Resource Type */
export type AwsResourceexplorer2Defaultviewassociation = {
  ViewArn: string;
  /**
   * The AWS principal that the default view is associated with, used as the unique identifier for this
   * resource.
   * @pattern ^[0-9]{12}$
   */
  AssociatedAwsPrincipal?: string;
};
