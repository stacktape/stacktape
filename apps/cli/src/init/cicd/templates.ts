/**
 * Deployment pipelines, one per host we support.
 *
 * Three decisions run through all of them, and they are the difference between a pipeline someone
 * keeps and one they delete:
 *
 * **Credentials are never generated.** Every template names the secrets it needs and stops there. A
 * generator that invents an access key, or worse writes one into a file, is a security incident with
 * a nice UX. GitHub gets OIDC — no long-lived key at all — because it is the one host where we can
 * assume a role without the user storing anything. GitLab and Bitbucket get access keys, because
 * OIDC on those requires per-project setup we cannot do from here and cannot verify.
 *
 * **One branch, one stage.** A pipeline that deploys three environments on a branching model we
 * guessed is a pipeline that surprises someone. This deploys the default branch to one stage, and the
 * comment says how to add more.
 *
 * **The CLI is pinned to the version that wrote the file.** An unpinned `@latest` in CI means a
 * Stacktape release can change what someone's pipeline does without them touching it.
 */

import type { GitHost } from './detect-host';

export type PipelineInputs = {
  /** Path to the configuration this pipeline should deploy, relative to the repository root. */
  configPath: string;
  stage: string;
  region: string;
  projectName: string;
  /** Pinned into the pipeline so CI runs the version this was generated against. */
  cliVersion: string;
};

export type PipelineTemplate = {
  /** Where the file goes, relative to the repository root. */
  path: string;
  contents: string;
  /**
   * What the user must add on the host before this runs.
   *
   * Shown in the wizard and printed in the terminal. Nothing here is created for them: these are
   * their credentials in their account, and a tool that sets them up quietly is a tool nobody can audit.
   */
  requiredSecrets: Array<{ name: string; description: string }>;
  /** One sentence about how the pipeline authenticates, for the screen that shows it. */
  authSummary: string;
};

const AWS_KEY_SECRETS = [
  {
    name: 'AWS_ACCESS_KEY_ID',
    description: 'Access key for a deployment user in your AWS account.'
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    description: 'Its secret. Store it as a masked/protected variable.'
  }
];

const github = ({ configPath, stage, region, projectName, cliVersion }: PipelineInputs): PipelineTemplate => ({
  path: '.github/workflows/deploy.yml',
  authSummary: 'Assumes an IAM role through GitHub’s OIDC provider, so no AWS key is ever stored in your repository.',
  requiredSecrets: [
    {
      name: 'AWS_DEPLOY_ROLE_ARN',
      description:
        'ARN of an IAM role your repository may assume. Create it with GitHub as an OIDC provider and trust this repository.'
    }
  ],
  contents: `# Written by \`stacktape init\`. Edit it freely — it is yours now.
#
# Authentication is OIDC: GitHub hands AWS a short-lived token and AWS hands back temporary
# credentials, so there is no access key in this repository to leak or rotate. It needs one secret,
# AWS_DEPLOY_ROLE_ARN, pointing at a role that trusts this repository.
#
# To deploy more stages, copy the job and change --stage; a stage is one isolated environment.

name: Deploy

on:
  push:
    branches: [main, master]
  workflow_dispatch:

# Required for the OIDC token exchange below. Without it the deploy fails at the credentials step.
permissions:
  id-token: write
  contents: read

# One deploy at a time. A second push while the first is still running would race CloudFormation.
concurrency:
  group: deploy-${stage}
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: \${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${region}

      # Pinned deliberately: an unpinned install lets a Stacktape release change what this pipeline
      # does without anyone editing it.
      - run: npm install -g stacktape@${cliVersion}

      - run: |
          stacktape deploy \\
            --configPath ${configPath} \\
            --projectName ${projectName} \\
            --stage ${stage} \\
            --region ${region} \\
            --autoConfirmOperation
`
});

const gitlab = ({ configPath, stage, region, projectName, cliVersion }: PipelineInputs): PipelineTemplate => ({
  path: '.gitlab-ci.yml',
  authSummary: 'Uses an AWS access key stored as a masked, protected CI/CD variable.',
  requiredSecrets: AWS_KEY_SECRETS,
  contents: `# Written by \`stacktape init\`. Edit it freely — it is yours now.
#
# Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY under Settings → CI/CD → Variables, both masked and
# protected. GitLab can also do OIDC against AWS, which avoids storing a key at all; it needs an
# identity provider set up in your account first, so this file uses the version that works today.

stages:
  - deploy

deploy:
  stage: deploy
  image: node:24
  # One deploy at a time: a second pipeline while the first is running would race CloudFormation.
  resource_group: deploy-${stage}
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    # Pinned deliberately: an unpinned install lets a Stacktape release change what this pipeline
    # does without anyone editing it.
    - npm install -g stacktape@${cliVersion}
    - >
      stacktape deploy
      --configPath ${configPath}
      --projectName ${projectName}
      --stage ${stage}
      --region ${region}
      --autoConfirmOperation
`
});

const bitbucket = ({ configPath, stage, region, projectName, cliVersion }: PipelineInputs): PipelineTemplate => ({
  path: 'bitbucket-pipelines.yml',
  authSummary: 'Uses an AWS access key stored as a secured repository variable.',
  requiredSecrets: AWS_KEY_SECRETS,
  contents: `# Written by \`stacktape init\`. Edit it freely — it is yours now.
#
# Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY under Repository settings → Repository variables,
# both marked secured.

image: node:24

pipelines:
  branches:
    main:
      - step: &deploy
          name: Deploy
          deployment: ${stage}
          script:
            # Pinned deliberately: an unpinned install lets a Stacktape release change what this
            # pipeline does without anyone editing it.
            - npm install -g stacktape@${cliVersion}
            - >
              stacktape deploy
              --configPath ${configPath}
              --projectName ${projectName}
              --stage ${stage}
              --region ${region}
              --autoConfirmOperation
    master:
      - step: *deploy
`
});

const BUILDERS: Record<GitHost, (inputs: PipelineInputs) => PipelineTemplate> = {
  github,
  gitlab,
  bitbucket
};

export const pipelineFor = (host: GitHost, inputs: PipelineInputs): PipelineTemplate => BUILDERS[host](inputs);

export const HOST_LABELS: Record<GitHost, string> = {
  github: 'GitHub Actions',
  gitlab: 'GitLab CI/CD',
  bitbucket: 'Bitbucket Pipelines'
};
