export const getFileNameFromStage = (stageName: string) => {
  if (stageName === 'staging') {
    return 'my-staging-vars.env';
  }
  return 'my-dev-vars.env';
};
