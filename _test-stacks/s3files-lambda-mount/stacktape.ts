import {
  LambdaFunction,
  LambdaS3FilesMount,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';
import { IntrinsicFunction } from '../../@generated/cloudform/dataTypes';

const region = 'eu-west-1';
const accountId = '977946299200';
const vpcCidr = '172.16.0.0/16';
const stacktapeSubnetLogicalNames = ['StpPublicSubnet0', 'StpPublicSubnet1', 'StpPublicSubnet2'];
const getAtt = (logicalName: string, attributeName: string) =>
  new IntrinsicFunction('Fn::GetAtt', [logicalName, attributeName]);

const getS3FilesMountTarget = (subnetLogicalName: string) => ({
  Type: 'AWS::S3Files::MountTarget',
  Properties: {
    FileSystemId: {
      'Fn::GetAtt': ['S3FilesFileSystem', 'FileSystemId']
    },
    SubnetId: { Ref: subnetLogicalName },
    IpAddressType: 'IPV4_ONLY',
    SecurityGroups: [{ Ref: 'S3FilesMountTargetSecurityGroup' }]
  }
});

export default defineConfig(() => {
  const mountApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/mount-test.ts'
    }),
    memory: 1024,
    timeout: 30,
    joinDefaultVpc: true,
    environment: {
      S3_FILES_MOUNT_PATH: '/mnt/s3files'
    },
    volumeMounts: [
      new LambdaS3FilesMount({
        accessPointArn: getAtt('S3FilesAccessPoint', 'AccessPointArn'),
        mountPath: '/mnt/s3files'
      })
    ],
    iamRoleStatements: [
      {
        Resource: ['*'],
        Effect: 'Allow',
        Action: ['s3:ListBucket']
      },
      {
        Resource: ['*'],
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion', 's3:PutObject']
      }
    ],
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['*'],
        allowedMethods: ['*'],
        allowedHeaders: ['*']
      }
    }
  });

  return {
    stackConfig: {
      tags: [{ name: 'purpose', value: 's3files-lambda-mount-test' }]
    },
    resources: { mountApi },
    cloudformationResources: {
      S3FilesBackingBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          VersioningConfiguration: {
            Status: 'Enabled'
          },
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [
              {
                ServerSideEncryptionByDefault: {
                  SSEAlgorithm: 'AES256'
                }
              }
            ]
          }
        }
      },
      S3FilesSyncRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowS3FilesAssumeRole',
                Effect: 'Allow',
                Principal: {
                  Service: 'elasticfilesystem.amazonaws.com'
                },
                Action: 'sts:AssumeRole',
                Condition: {
                  StringEquals: {
                    'aws:SourceAccount': accountId
                  },
                  ArnLike: {
                    'aws:SourceArn': `arn:aws:s3files:${region}:${accountId}:file-system/*`
                  }
                }
              }
            ]
          },
          Policies: [
            {
              PolicyName: 's3-files-bucket-sync',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'S3BucketPermissions',
                    Effect: 'Allow',
                    Action: ['s3:ListBucket', 's3:ListBucketVersions'],
                    Resource: { 'Fn::GetAtt': ['S3FilesBackingBucket', 'Arn'] },
                    Condition: {
                      StringEquals: {
                        'aws:ResourceAccount': accountId
                      }
                    }
                  },
                  {
                    Sid: 'S3ObjectPermissions',
                    Effect: 'Allow',
                    Action: [
                      's3:AbortMultipartUpload',
                      's3:DeleteObject*',
                      's3:GetObject*',
                      's3:List*',
                      's3:PutObject*'
                    ],
                    Resource: {
                      'Fn::Join': ['', [{ 'Fn::GetAtt': ['S3FilesBackingBucket', 'Arn'] }, '/*']]
                    },
                    Condition: {
                      StringEquals: {
                        'aws:ResourceAccount': accountId
                      }
                    }
                  },
                  {
                    Sid: 'EventBridgeManage',
                    Effect: 'Allow',
                    Action: [
                      'events:DeleteRule',
                      'events:DisableRule',
                      'events:EnableRule',
                      'events:PutRule',
                      'events:PutTargets',
                      'events:RemoveTargets'
                    ],
                    Resource: ['arn:aws:events:*:*:rule/DO-NOT-DELETE-S3-Files*'],
                    Condition: {
                      StringEquals: {
                        'events:ManagedBy': 'elasticfilesystem.amazonaws.com'
                      }
                    }
                  },
                  {
                    Sid: 'EventBridgeRead',
                    Effect: 'Allow',
                    Action: [
                      'events:DescribeRule',
                      'events:ListRuleNamesByTarget',
                      'events:ListRules',
                      'events:ListTargetsByRule'
                    ],
                    Resource: ['arn:aws:events:*:*:rule/*']
                  }
                ]
              }
            }
          ]
        }
      },
      S3FilesMountTargetSecurityGroup: {
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          GroupDescription: 'Allows Lambda clients to mount the S3 Files test file system',
          VpcId: { Ref: 'StpVpc' },
          SecurityGroupIngress: [
            {
              IpProtocol: 'tcp',
              FromPort: 2049,
              ToPort: 2049,
              CidrIp: vpcCidr
            }
          ],
          SecurityGroupEgress: [
            {
              IpProtocol: '-1',
              CidrIp: '0.0.0.0/0'
            }
          ]
        }
      },
      S3FilesFileSystem: {
        Type: 'AWS::S3Files::FileSystem',
        Properties: {
          AcceptBucketWarning: true,
          Bucket: { 'Fn::GetAtt': ['S3FilesBackingBucket', 'Arn'] },
          RoleArn: { 'Fn::GetAtt': ['S3FilesSyncRole', 'Arn'] }
        }
      },
      S3FilesMountTargetA: getS3FilesMountTarget(stacktapeSubnetLogicalNames[0]),
      S3FilesMountTargetB: getS3FilesMountTarget(stacktapeSubnetLogicalNames[1]),
      S3FilesMountTargetC: getS3FilesMountTarget(stacktapeSubnetLogicalNames[2]),
      S3FilesAccessPoint: {
        Type: 'AWS::S3Files::AccessPoint',
        DependsOn: ['S3FilesMountTargetA', 'S3FilesMountTargetB', 'S3FilesMountTargetC'],
        Properties: {
          FileSystemId: {
            'Fn::GetAtt': ['S3FilesFileSystem', 'FileSystemId']
          },
          PosixUser: {
            Uid: '1000',
            Gid: '1000'
          },
          RootDirectory: {
            Path: '/lambda',
            CreationPermissions: {
              OwnerUid: '1000',
              OwnerGid: '1000',
              Permissions: '0775'
            }
          }
        }
      }
    }
  };
});
