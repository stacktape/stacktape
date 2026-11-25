/** The site's domains per stage, read by `stacktape.yml`: the apex and `www` in production, a stage subdomain elsewhere. */
export const getWebDomains = (stage: string): { domainName: string }[] => {
  if (stage === 'prod' || stage === 'production') {
    return [{ domainName: 'stacktape.com' }, { domainName: 'www.stacktape.com' }];
  }
  return [{ domainName: `${stage}-web.stacktape.com` }];
};

export const getWebBuildCommand = (stage: string) =>
  stage === 'production'
    ? 'STACKTAPE_WEBSITE_STAGE=production pnpm run build'
    : 'STACKTAPE_WEBSITE_STAGE=preview pnpm run build';
