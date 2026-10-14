# cfn-lint registry schemas

cfn-lint 1.53.3 does not know the Lambda Web Function resource types yet and rejects them with E3006, and its
`AWS::Lambda::NetworkConnector` data predates `WebFunction` connectors and the `LatestVersionArn` attribute. CI passes
this directory to `cfn-lint --registry-schemas`, which replaces cfn-lint's data for exactly these four types without
ignoring any check for other types. cfn-lint does not validate their properties from these schemas; the typed templates
generated from `@aws-cdk/aws-service-spec` and the live `web-function` canary cover that.

The files are the CloudFormation registry schemas from
`aws cloudformation describe-type --type RESOURCE --type-name <type> --query Schema` (eu-west-1, 13 Oct 2026).

Delete this directory and the `--registry-schemas` flags in `.github/workflows/ci.yml` once the pinned cfn-lint version
knows `AWS::Lambda::WebFunction`, `AWS::Lambda::WebFunctionRevision`, `AWS::Lambda::WebFunctionEndpoint` and
`WebFunction` network connectors.
