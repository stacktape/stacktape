import { expect, test } from 'bun:test';
import { getDeveloperTrustStatement } from './iam';

// The roles of a dev stack's locally running containers trust exactly the developer who runs dev mode: the account
// root as principal, limited by `aws:PrincipalArn`. A session ARN leaves out its role's path (SSO roles live under
// `/aws-reserved/...`), so the role is matched under any path; role names are unique in an account.
test.each([
  {
    identity: 'arn:aws:sts::123456789012:assumed-role/OrganizationAccountAccessRole/ci-session',
    root: 'arn:aws:iam::123456789012:root',
    principalArns: [
      'arn:aws:iam::123456789012:role/OrganizationAccountAccessRole',
      'arn:aws:iam::123456789012:role/*/OrganizationAccountAccessRole'
    ]
  },
  {
    identity: 'arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_Admin_0123abcd/jane@example.com',
    root: 'arn:aws:iam::123456789012:root',
    principalArns: [
      'arn:aws:iam::123456789012:role/AWSReservedSSO_Admin_0123abcd',
      'arn:aws:iam::123456789012:role/*/AWSReservedSSO_Admin_0123abcd'
    ]
  },
  {
    identity: 'arn:aws:iam::123456789012:user/developers/jane',
    root: 'arn:aws:iam::123456789012:root',
    principalArns: ['arn:aws:iam::123456789012:user/developers/jane']
  },
  {
    identity: 'arn:aws-us-gov:sts::123456789012:assumed-role/Developer/jane',
    root: 'arn:aws-us-gov:iam::123456789012:root',
    principalArns: [
      'arn:aws-us-gov:iam::123456789012:role/Developer',
      'arn:aws-us-gov:iam::123456789012:role/*/Developer'
    ]
  }
])('a dev container role trusts only $identity', ({ identity, root, principalArns }) => {
  expect(getDeveloperTrustStatement(identity)).toEqual({
    Effect: 'Allow',
    Principal: { AWS: root },
    Action: 'sts:AssumeRole',
    Condition: { ArnLike: { 'aws:PrincipalArn': [...principalArns] } }
  });
});

test.each(['arn:aws:sts::123456789012:federated-user/jane', 'arn:aws:iam::123456789012:root', 'not-an-arn'])(
  'no trust statement for %s, which a trust policy cannot limit to one developer',
  (identity) => {
    expect(getDeveloperTrustStatement(identity)).toBeUndefined();
  }
);
