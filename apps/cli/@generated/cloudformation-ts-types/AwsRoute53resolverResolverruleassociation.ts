// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverruleassociation.json

/**
 * In the response to an
 * [AssociateResolverRule](https://docs.aws.amazon.com/Route53/latest/APIReference/API_route53resolver_AssociateResolverRule.html),
 * [DisassociateResolverRule](https://docs.aws.amazon.com/Route53/latest/APIReference/API_route53resolver_DisassociateResolverRule.html),
 * or
 * [ListResolverRuleAssociations](https://docs.aws.amazon.com/Route53/latest/APIReference/API_route53resolver_ListResolverRuleAssociations.html)
 * request, provides information about an association between a resolver rule and a VPC. The
 * association determines which DNS queries that originate in the VPC are forwarded to your network.
 */
export type AwsRoute53resolverResolverruleassociation = {
  /** The ID of the VPC that you associated the Resolver rule with. */
  VPCId: string;
  /** The ID of the Resolver rule that you associated with the VPC that is specified by ``VPCId``. */
  ResolverRuleId: string;
  ResolverRuleAssociationId?: string;
  /** The name of an association between a Resolver rule and a VPC. */
  Name?: string;
};
