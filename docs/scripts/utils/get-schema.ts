import cliArgsSchema from '@generated/schemas/cli-schema.json';
import sdkArgsSchema from '@generated/schemas/sdk-schema.json';

const forcedCommandOrder = [
  'deploy',
  'codebuild:deploy',
  'dev',
  'delete',
  'logs',
  'init',
  'stack:list',
  'stack:info',
  'secret:create',
  'secret:get',
  'secret:delete'
];

export const getSortedCliArgsSchema = async (): Promise<
  {
    command: string;
    commandSchema: any;
  }[]
> => {
  const res: {
    command: string;
    commandSchema: any;
  }[] = [];
  forcedCommandOrder.forEach((command) => {
    res.push({ command, commandSchema: cliArgsSchema[command] });
  });

  Object.entries(cliArgsSchema).forEach(async ([command, commandSchema]) => {
    if (!res.find((s) => s.command === command)) {
      res.push({ command, commandSchema });
    }
  });
  return res;
};

export const getSortedSdkArgsSchema = async () => {
  const res: {
    method: string;
    methodSchema: any;
  }[] = [];
  forcedCommandOrder.forEach((method) => {
    if (sdkArgsSchema[method]) {
      res.push({ method, methodSchema: sdkArgsSchema[method] });
    }
  });

  Object.entries(sdkArgsSchema).forEach(async ([method, methodSchema]) => {
    if (!res.find((s) => s.method === method)) {
      res.push({ method, methodSchema });
    }
  });
  return res.filter(Boolean);
};
