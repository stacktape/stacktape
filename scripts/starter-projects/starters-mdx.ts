import { join } from 'node:path';
import { outputFile, pathExistsSync, readFile } from 'fs-extra';

// - For more details, refer to [Stacktape quickstart tutorial docs](https://docs.stacktape.com/getting-started/quickstart-tutorials/${starterProjectId}/).
export const addReadme = async ({
  metadata: { name, starterProjectId },
  mdxDescription: {
    mdxAfterDeploy,
    mdxDeployAppCodeOnly,
    mdxDeployment,
    mdxDescription,
    mdxDevMode,
    mdxStackDescription,
    mdxPrerequisites,
    mdxBeforeDeploy
  },
  distPath,
  mode
}: {
  distPath: string;
  mdxDescription: StarterProjectMdxDescription;
  metadata: StarterProjectMetadata;
  mode: 'github' | 'app';
}) => {
  const deployInConsoleLink =
    'https://console.stacktape.com/create-new-project/git-project-using-console?name=my-stacktape-app&repositoryType=public&repositoryUrl=';

  let sectionNumber = 0;
  const genProjectSection = `To initialize the project, use

\`\`\`bash
stacktape init --starterId ${starterProjectId}
\`\`\``;

  const res = `
# ${name}

> [!TIP]
> To deploy this project using **GUI-based flow**, navigate to [console](${deployInConsoleLink}https://github.com/stacktape/starter-${starterProjectId})

${mdxDescription.trim()}
- This project includes a pre-configured [stacktape.yml configuration](stacktape.yml).
The configured infrastructure is described in the [stack description section](#stack-description)

## Prerequisites

${mdxPrerequisites}

${mode === 'github' ? `## ${++sectionNumber}. Generate your project` : ''}
${mode === 'github' ? genProjectSection : ''}

${mdxBeforeDeploy ? `## ${++sectionNumber}. Before deploy` : ''}
${mdxBeforeDeploy || ''}

## ${++sectionNumber}. Deploy your stack

${mdxDeployment}

## ${++sectionNumber}. Test your application

After a successful deployment, some information about the stack will be printed to the terminal (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

${mdxAfterDeploy}

${mdxDevMode ? `## ${++sectionNumber}. Run the application in development mode` : ''}
${mdxDevMode || ''}

${mdxDeployAppCodeOnly ? `## ${++sectionNumber}. Hotswap deploys` : ''}
${mdxDeployAppCodeOnly || ''}

## ${++sectionNumber}. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

\`\`\`bash
stacktape delete --stage <<stage>> --region <<region>>
\`\`\`

${mdxStackDescription}`
    .replaceAll('# {start-highlight}\n', '')
    .replaceAll('# {stop-highlight}\n', '');

  return outputFile(distPath, res, { encoding: 'utf8' });
};

const getRegionsTable = () => {
  return `| Region name & Location     | code           |
  | -------------------------- | -------------- |
  | Europe (Ireland)           | eu-west-1      |
  | Europe (London)            | eu-west-2      |
  | Europe (Frankfurt)         | eu-central-1   |
  | Europe (Milan)             | eu-south-1     |
  | Europe (Paris)             | eu-west-3      |
  | Europe (Stockholm)         | eu-north-1     |
  | US East (Ohio)             | us-east-2      |
  | US East (N. Virginia)      | us-east-1      |
  | US West (N. California)    | us-west-1      |
  | US West (Oregon)           | us-west-2      |
  | Canada (Central)           | ca-central-1   |
  | Africa (Cape Town)         | af-south-1     |
  | Asia Pacific (Hong Kong)   | ap-east-1      |
  | Asia Pacific (Mumbai)      | ap-south-1     |
  | Asia Pacific (Osaka-Local) | ap-northeast-3 |
  | Asia Pacific (Seoul)       | ap-northeast-2 |
  | Asia Pacific (Singapore)   | ap-southeast-1 |
  | Asia Pacific (Sydney)      | ap-southeast-2 |
  | Asia Pacific (Tokyo)       | ap-northeast-1 |
  | China (Beijing)            | cn-north-1     |
  | China (Ningxia)            | cn-northwest-1 |
  | Middle East (Bahrain)      | me-south-1     |
  | South America (São Paulo)  | sa-east-1      |`;
};

const getLocalDeploymentMdx = ({ usedResourceTypes, projectType }: StarterProjectMetadata) => {
  return `<details>
<summary>Deploy from local machine</summary>

<br />

The deployment from local machine will build and deploy the application from your system. This means you also need to have:
${
  usedResourceTypes.includes('multi-container-workload') ||
  usedResourceTypes.includes('batch-job') ||
  usedResourceTypes.includes('function') ||
  usedResourceTypes.includes('private-service') ||
  usedResourceTypes.includes('web-service') ||
  usedResourceTypes.includes('worker-service')
    ? '- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).'
    : ''
}${
    projectType === 'ruby'
      ? '- [Ruby](https://www.ruby-lang.org/en/documentation/installation/) and [Bundler](https://bundler.io/) installed. On Windows, also install MSYS2.'
      : ''
  }${
    projectType === 'python'
      ? '- [Python version > 3.9](https://www.python.org/) and [Poetry](https://python-poetry.org/docs/) package manager installed.'
      : ''
  }${projectType === 'es' ? '- Node.js installed.' : ''}

<br />

To perform the deployment, use the following command:

\`\`\`bash
stacktape deploy --projectName <<project-name>> --stage <<stage>> --region <<region>>
\`\`\`

\`stage\` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

\`region\` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

\`projectName\` is the name of your project. You can create it in the console or interactively using CLI.

<br />

${getRegionsTable()}

</details>`;
};

const getCodebuildDeployMdx = () => {
  return `<details>
<summary>Deploy using AWS CodeBuild pipeline</summary>

<br />

Deployment using AWS CodeBuild will build and deploy your application inside [AWS CodeBuild pipeline](https://aws.amazon.com/codebuild/). To perform the deployment, use

\`\`\`bash
stacktape codebuild:deploy --stage <<stage>> --region <<region>> --projectName <<project-name>>
\`\`\`

\`stage\` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

\`region\` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

\`projectName\` is the name of your project. You can create it in the console or interactively using CLI.

<br />

${getRegionsTable()}

</details>`;
};

const getGithubActionsDeployMdx = () => {
  return `<details>
<summary>Deploy using Github actions CI/CD pipeline</summary>

<br />

1. If you don't have one, create a new repository at https://github.com/new
2. Create Github repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-github-repository-secrets
3. Replace \`<<stage>>\` and \`<<region>>\` in the .github/workflows/deploy.yml file.
4. \`git init --initial-branch=main\`
5. \`git add .\`
6. \`git commit -m "setup stacktape project"\`
7. \`git remote add origin git@github.com:<<namespace-name>>/<<repo-name>>.git\`
8. \`git push -u origin main\`
9. To monitor the deployment progress, navigate to your github project and select the Actions tab

\`stage\` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

\`region\` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

\`projectName\` is the name of your project. You can create it in the console or interactively using CLI.

<br />

${getRegionsTable()}

</details>`;
};

const getGitlabCiDeployMdx = () => {
  return `<details>
<summary>Deploy using Gitlab CI pipeline</summary>

<br />

1. If you don't have one, create a new repository at https://gitlab.com/projects/new
2. Create Gitlab repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-gitlab-repository-secrets
3. replace \`<<stage>>\` and \`<<region>>\` in the .gitlab-ci.yml file.
4. \`git init --initial-branch=main\`
5. \`git add .\`
6. \`git commit -m "setup stacktape project"\`
7. \`git remote add origin git@gitlab.com:<<namespace-name>>/<<repo-name>>.git\`
8. \`git push -u origin main\`
9. \`To monitor the deployment progress, navigate to your gitlab project and select CI/CD->jobs\`

\`stage\` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

\`region\` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

\`projectName\` is the name of your project. You can create it in the console or interactively using CLI.

<br />

${getRegionsTable()}

</details>`;
};

const getDeploymentMdx = (metadata: StarterProjectMetadata) => {
  return `The deployment will take ~5-15 minutes. Subsequent deploys will be significantly faster.

${getLocalDeploymentMdx(metadata)}
${getCodebuildDeployMdx()}
${getGithubActionsDeployMdx()}
${getGitlabCiDeployMdx()}`;
};

const generateAfterDeployMdx = ({
  isRestApi,
  isSpaWebsite,
  isStaticWebsite,
  isServerSideRenderedWebsite
}: Pick<StarterProjectMetadata, 'isSpaWebsite' | 'isRestApi' | 'isStaticWebsite' | 'isServerSideRenderedWebsite'>) => {
  if (isRestApi) {
    return `To test the application, you will need the web service URL. It's printed to the terminal.

### Create a post
Make a \`POST\` request to \`<<web_service_url>>/post\` with the JSON data in its body to save the post. Use your preferred HTTP client or
the following cURL command:

\`\`\`bash
curl -X POST <<web_service_url>>/posts -H 'content-type: application/json' -d '{ "title": "MyPost", "content": "Hello!", "authorEmail": "info@stacktape.com"}'
\`\`\`

If the above cURL command did not work, try escaping the JSON content:

\`\`\`bash
curl -X POST <<web_service_url>>/posts -H 'content-type: application/json' -d '{ \\"title\\":\\"MyPost\\",\\"content\\":\\"Hello!\\",\\"authorEmail\\":\\"info@stacktape.com\\"}'
\`\`\`

### Get all posts

Make a \`GET\` request to \`<<web_service_url>>/posts\` to get all posts.

\`\`\`bash
curl <<web_service_url>>/posts
\`\`\``;
  }
  if (isSpaWebsite || isStaticWebsite) {
    return '- Visit the CDN URL printed to the terminal.';
  }
  if (isServerSideRenderedWebsite) {
    return '- Visit the URL of the website printed to the terminal.';
  }
  return '';
};

const generateMdxHotSwapDeploy = (
  _props: Pick<StarterProjectMetadata, 'isSpaWebsite' | 'tags' | 'isRestApi' | 'isStaticWebsite'>
) => {
  return `- Stacktape deployments use [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.

- To speed up the deployment, you can use the \`--hotSwap\` flag which avoids using Cloudformation.
- Hotswap deployments work only for source code changes (for lambda function, containers and batch jobs) and for content uploads to buckets.
- If the update deployment is not hot-swappable, Stacktape will automatically fall back to using a Cloudformation deployment.
\`\`\`bash
stacktape deploy --hotSwap --stage <<stage>> --region <<region>> --projectName <<project-name>>
\`\`\``;
};

const getContainerResourceData = (usedResources: UsedResourceData[]) => {
  const containerTypes = ['multi-container-workload', 'web-service', 'worker-service', 'private-service'];
  const resource = usedResources.find((r) => containerTypes.includes(r.type));
  if (!resource) return null;
  return { resourceName: resource.name, containerName: resource.containerNames?.[0] };
};

const getLambdaData = (usedResources: UsedResourceData[]) => {
  const resource = usedResources.find((r) => r.type === 'function');
  if (!resource) return null;
  return { resourceName: resource.name };
};

const generateMdxDevMode = ({
  usedResourceTypes,
  usedResources
}: Pick<StarterProjectMetadata, 'usedResourceTypes' | 'usedResources'>) => {
  const containerTypes = ['multi-container-workload', 'web-service', 'worker-service', 'private-service'];
  const hasContainerResource = usedResourceTypes.some((t) => containerTypes.includes(t));

  if (hasContainerResource) {
    const data = getContainerResourceData(usedResources);
    if (!data) return '';
    const { resourceName, containerName } = data;
    const containerFlag = containerName ? ` --container ${containerName}` : '';
    return `To run the service in the development mode (locally on your machine), you can use the
[dev command](https://docs.stacktape.com/cli/commands/dev/).

\`\`\`bash
stacktape dev --region <<your-region>> --stage <<stage>> --resourceName ${resourceName}${containerFlag}
\`\`\`

Stacktape runs the container as closely to the deployed version as possible:

- Maps container ports to the host machine.
- Injects parameters referenced in the environment variables by \`$ResourceParam\` and \`$Secret\` directives to the
  running container.
- Injects credentials of the [assumed role](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) to
  the container. This means that your locally running container will have the exact same IAM permissions as the deployed
  version.
- Pretty-prints logs (stdout/stderr) produced by the container to the terminal.

<br />

The container is rebuilt and restarted, when you either:

- type \`rs + enter\` to the terminal
- use the \`--watch\` option and one of your source code files changes`;
  }
  if (usedResourceTypes.includes('function')) {
    const data = getLambdaData(usedResources);
    if (!data) return '';
    const { resourceName } = data;
    return `To run functions in the development mode (remotely on AWS), you can use the
[dev command](https://docs.stacktape.com/cli/commands/dev/). For example, to develop and debug lambda function \`${resourceName}\`, you can use

\`\`\`bash
stacktape dev --region <<your-region>> --stage <<stage>> --resourceName ${resourceName}
\`\`\`

The command will:
- quickly re-build and re-deploy your new function code
- watch for the function logs and pretty-print them to the terminal

The function is rebuilt and redeployed, when you either:
- type \`rs + enter\` to the terminal
- use the \`--watch\` option and one of your source code files changes`;
  }
  return '';
};

const generateMdxStackDescription = ({ projectStackDescription }: { projectStackDescription: string }) => {
  return `# Stack description

  Stacktape uses a simple \`stacktape.yml\` configuration file to describe infrastructure resources, packaging, deployment
  pipeline and other aspects of your project.

  You can deploy your project to multiple environments (stages) - for
  example \`production\`, \`staging\` or \`dev-john\`. A stack is a running instance of an project. It consists of your application
  code (if any) and the infrastructure resources required to run it.

  The configuration for this project is described below.

  ## 1. Resources

  - Every resource must have an arbitrary, alphanumeric name (A-z0-9).
  - Stacktape resources consist of multiple underlying AWS or 3rd party resources.
${projectStackDescription}`;
};

const generateBeforeDeployMdx = ({ usedResourceTypes, projectType }: StarterProjectMetadata) => {
  let res = '';
  if (usedResourceTypes.includes('mongo-db-atlas-cluster')) {
    res +=
      '- Fill in your MongoDb Atlas credentials in the `providerConfig.mongoDbAtlas` section of the stacktape.yml config file. To learn how to get your API keys and organization ID, refer to [MongoDB Atlas tutorial](https://docs.atlas.mongodb.com/configure-api-access/#std-label-atlas-prog-api-key).';
  }
  if (usedResourceTypes.includes('upstash-redis')) {
    res +=
      '- Fill in your Upstash credentials in the `providerConfig.upstash` section of the stacktape.yml config file. You can get your API key in the [Upstash console](https://console.upstash.com/account/api).';
  }
  if (projectType === 'python') {
    res +=
      ' - Install your projects dependencies. The recommended way is to use [Virtual environment](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/).';
  }
  return res;
};

const generateMdxPrerequisites = ({ usedResourceTypes }: StarterProjectMetadata) => {
  return `1. **AWS account**. If you don't have one, [create new account here](https://portal.aws.amazon.com/billing/signup).

2. **Stacktape account**. If you don't have one, [create new account here](https://console.stacktape.com/sign-up).

3. **Stacktape installed**.

  <details>
  <summary>Install on Windows (Powershell)</summary>

  \`\`\`bash
  iwr https://installs.stacktape.com/windows.ps1 -useb | iex
  \`\`\`

  </details>
  <details>
  <summary>Install on Linux</summary>

  \`\`\`bash
  curl -L https://installs.stacktape.com/linux.sh | sh
  \`\`\`

  </details>
  <details>
  <summary>Install on MacOS</summary>

  \`\`\`bash
  curl -L https://installs.stacktape.com/macos.sh | sh
  \`\`\`

  </details>
  <details>
  <summary>Install on MacOS ARM (Apple silicon)</summary>

  \`\`\`bash
  curl -L https://installs.stacktape.com/macos-arm.sh | sh
  \`\`\`

  </details>

${
  usedResourceTypes.includes('mongo-db-atlas-cluster')
    ? '4. **MongoDb Atlas account**. To create one, refer to our [step-by-step guide](https://docs.stacktape.com/user-guides/mongo-db-atlas-credentials/).'
    : ''
}
${
  usedResourceTypes.includes('upstash-redis')
    ? "4. **Upstash account**. If you don't have one, [create new account here](https://console.upstash.com/login)."
    : ''
}`;
};

const readMdxDescriptions = async ({ absoluteProjectPath }: { absoluteProjectPath: string }) => {
  const fileNames = ['description.md', 'stack-descriptions.md', 'before-deploy.md', 'after-deploy.md'];
  const [description, stackDescription, beforeDeploy, afterDeploy] = await Promise.all(
    fileNames.map((fileName) => {
      const absolutePath = join(absoluteProjectPath, '.project', fileName);
      if (!pathExistsSync(absolutePath)) {
        return null;
      }
      return readFile(absolutePath, { encoding: 'utf8' });
    })
  );
  return { description, stackDescription, beforeDeploy, afterDeploy };
};

type StarterProjectMdxDescription = Awaited<ReturnType<typeof getProjectMdx>>;

export const getProjectMdx = async (metadata: StarterProjectMetadata, absoluteProjectPath: string) => {
  const { description, stackDescription, afterDeploy } = await readMdxDescriptions({ absoluteProjectPath });
  const {
    tags,
    usedResources,
    usedResourceTypes,
    isRestApi,
    isServerSideRenderedWebsite,
    isSpaWebsite,
    isStaticWebsite
  } = metadata;

  const mdxStackDescription = generateMdxStackDescription({
    projectStackDescription: stackDescription
  });
  const mdxBeforeDeploy = generateBeforeDeployMdx(metadata);
  const mdxAfterDeploy =
    afterDeploy || generateAfterDeployMdx({ isRestApi, isServerSideRenderedWebsite, isSpaWebsite, isStaticWebsite });
  const mdxDeployAppCodeOnly = generateMdxHotSwapDeploy({ isSpaWebsite, isStaticWebsite, isRestApi, tags });
  const mdxDevMode = generateMdxDevMode({ usedResourceTypes, usedResources });
  const mdxPrerequisites = generateMdxPrerequisites(metadata);
  const mdxDeployment = getDeploymentMdx(metadata);

  return {
    mdxDescription: description,
    mdxStackDescription,
    mdxDeployment,
    mdxAfterDeploy,
    mdxDevMode,
    mdxDeployAppCodeOnly,
    mdxPrerequisites,
    mdxBeforeDeploy
  };
};
