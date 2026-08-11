type FullDeployOperation = {
  deploymentArtifacts: {
    cloudformationTemplateUrl: string;
    deleteAllObsoleteArtifacts: () => Promise<unknown>;
    deleteArtifactsFixedDeploy: () => Promise<unknown>;
  };
  stack: {
    deployStack: (templateUrl: string) => Promise<{ warningMessages?: string[] }>;
    existingStackDetails?: { StackStatus?: string };
  };
  tui: { warn: (message: string) => unknown };
};

export const performFullDeploy = async ({
  deploymentArtifacts,
  stack,
  tui,
}: FullDeployOperation) => {
  // CloudFormation can still finish or roll back after monitoring reports a failure. Let deployment errors propagate
  // without deleting artifacts; a later successful deployment can prove when they are obsolete.
  const { warningMessages } = await stack.deployStack(
    deploymentArtifacts.cloudformationTemplateUrl,
  );
  warningMessages?.forEach((msg) => {
    tui.warn(msg);
  });

  // if we have just fixed stack from UPDATE FAILED state, there can be some artifacts created during multiple fixing attempts
  // these artifacts need cleaning up before we delete old versions with deleteAllObsoleteArtifacts
  if (stack.existingStackDetails?.StackStatus === "UPDATE_FAILED") {
    await deploymentArtifacts.deleteArtifactsFixedDeploy();
  }

  await deploymentArtifacts.deleteAllObsoleteArtifacts();
};
