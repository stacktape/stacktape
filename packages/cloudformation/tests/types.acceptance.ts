import type { CloudFormationResourceProperties } from '../generated/resource-types.ts';
import type { Code, FunctionProperties } from '../generated/resources/aws-lambda-function.ts';
import { getAtt, ref } from '../src/intrinsics.ts';
import { cfnResource, cfnResourceUnchecked, type CloudFormationTemplate } from '../src/resource.ts';

const code: Code = { S3Bucket: ref('ArtifactBucket'), S3Key: 'function.zip' };
const properties: FunctionProperties = { Code: code, Role: getAtt('ExecutionRole', 'Arn') };
const mappedProperties: CloudFormationResourceProperties['AWS::Lambda::Function'] = properties;

const known = cfnResource('AWS::Lambda::Function', mappedProperties);
known.DependsOn = 'ExecutionRole';

const inferred = cfnResource('AWS::Lambda::Function', {
  Code: { S3Bucket: 'artifacts', S3Key: 'function.zip' },
  Role: 'role'
});
inferred.Properties.Code.S3Key = 'updated.zip';

interface NamedPolicyDocument {
  Statement: Array<{ Action: string; Effect: 'Allow' | 'Deny'; Resource: string }>;
  Version: string;
}
const namedPolicy: NamedPolicyDocument = { Statement: [], Version: '2012-10-17' };
cfnResource('AWS::IAM::Role', { AssumeRolePolicyDocument: namedPolicy });

// @ts-expect-error Unknown resource types must use the explicit unchecked escape hatch.
cfnResource('Company::Service::Widget', {});

// @ts-expect-error The resource type determines its writable property schema.
cfnResource('AWS::Lambda::Function', { BucketName: 'not-a-lambda-property' });

const unknown = cfnResourceUnchecked('Company::Service::Widget', { Arbitrary: { nested: true } });
unknown.Properties.Arbitrary.nested satisfies true;

// @ts-expect-error Arn is a read-only attribute, not writable Lambda configuration.
const readOnlyAttribute: FunctionProperties = { Code: code, Role: 'role', Arn: 'not-writable' };

// @ts-expect-error PackageType is restricted to values supported by the provider schema.
const invalidEnum: FunctionProperties = { Code: code, Role: 'role', PackageType: 'Tar' };

const mappingWithList: CloudFormationTemplate = {
  Mappings: { RegionMap: { 'eu-west-1': { AvailabilityZones: ['eu-west-1a', 'eu-west-1b'] } } },
  Resources: {}
};

const mappingWithInvalidScalar: CloudFormationTemplate = {
  Mappings: {
    RegionMap: {
      'eu-west-1': {
        // @ts-expect-error CloudFormation mappings accept only strings and string lists.
        Enabled: true
      }
    }
  },
  Resources: {}
};

void known;
void readOnlyAttribute;
void invalidEnum;
void mappingWithList;
void mappingWithInvalidScalar;
