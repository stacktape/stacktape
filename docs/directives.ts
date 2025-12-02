export const getDomain = (stage: string): string => {
  if (stage === 'prod' || stage === 'production') {
    return 'docs.stacktape.com';
  }
  return `${stage}-docs.stacktape.com`;
};
