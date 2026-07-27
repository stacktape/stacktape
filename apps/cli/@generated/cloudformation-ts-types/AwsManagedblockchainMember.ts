// This file is auto-generated. Do not edit manually.
// Source: aws-managedblockchain-member.json

/** Resource Type definition for AWS::ManagedBlockchain::Member */
export type AwsManagedblockchainMember = {
  MemberId?: string;
  NetworkId?: string;
  MemberConfiguration: {
    Description?: string;
    MemberFrameworkConfiguration?: {
      MemberFabricConfiguration?: {
        AdminUsername: string;
        AdminPassword: string;
      };
    };
    Name: string;
  };
  NetworkConfiguration?: {
    Description?: string;
    FrameworkVersion: string;
    VotingPolicy: {
      ApprovalThresholdPolicy?: {
        ThresholdComparator?: string;
        ThresholdPercentage?: number;
        ProposalDurationInHours?: number;
      };
    };
    Framework: string;
    Name: string;
    NetworkFrameworkConfiguration?: {
      NetworkFabricConfiguration?: {
        Edition: string;
      };
    };
  };
  InvitationId?: string;
};
