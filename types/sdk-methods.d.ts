type DeployReturnValue = {
  stackInfo: DetailedStackInfoMap;
  packagedWorkloads: PackageWorkloadOutput[];
  abortedBeforeStart?: boolean;
};
type CodebuildDeployReturnValue = { stackInfo: DetailedStackInfoMap };
type FnDeployFastReturnValue = any;
type CwDeployFastReturnValue = any;
type DeploymentScriptRunReturnValue = { success: boolean; returnedPayload: string };
type DeleteReturnValue = any;
type RollbackReturnValue = any;
type LogsReturnValue = any;
type StackInfoReturnValue = DetailedStackInfoMap;
type ParamGetReturnValue = string;
type StackListReturnValue = ListStacksInfo;
type StackHistoryReturnValue = any[];
type DevReturnValue = any;
type AwsProfileCreateReturnValue = any;
type AwsProfileUpdateReturnValue = any;
type AwsProfileDeleteReturnValue = any;
type ScriptRunReturnValue = any;
type AwsProfileListReturnValue = {
  profile: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}[];
type UserpoolCreateUserReturnValue = any;
type UserpoolGetTokenReturnValue = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};
type UserpoolListUsersReturnValue = Record<string, any>[];
type CompileTemplateReturnValue = any;
type PackageWorkloadsReturnValue = PackageWorkloadOutput[];
type PreviewChangesReturnValue = any;
type BucketSyncReturnValue = any;
type VersionReturnValue = string;
type UpgradeReturnValue = { oldVersion: string; newVersion: string };
