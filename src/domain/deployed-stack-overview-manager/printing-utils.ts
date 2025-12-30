import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@utils/tui';

const getTypedOutputsForResource = <T extends StpResourceType>(resource: {
  resourceType: T;
  outputs: any;
}): StacktapeResourceOutput<T> => {
  return resource.outputs as StacktapeResourceOutput<T>;
};

export const getResourceTypeSpecificInfoLines = ({
  resourceType,
  outputs
}: {
  resourceType: StackInfoMapResource['resourceType'];
  outputs: any;
}) => {
  let linesToPrint: string[] = [];
  // some resources might not have outputs section, because they were deployed in past
  if (!outputs) {
    return [];
  }
  if (resourceType === 'http-api-gateway') {
    const typedOutputs = getTypedOutputsForResource({ resourceType, outputs });
    if (typedOutputs?.integrations?.length) {
      typedOutputs.integrations.forEach(({ url, method, resourceName }, index, arr) => {
        const methodPart = `[${tuiManager.colorize('yellow', method)}]`;
        const resourceNamePart = `(${tuiManager.colorize('cyan', resourceName)})`;
        const urlPart = tuiManager.colorize('green', url.toString());
        const startLineDecorator = `${arr.length - 1 === index ? '└' : '├'}`;
        linesToPrint.push(`  ${startLineDecorator} ${methodPart} ${urlPart} ${resourceNamePart}`);
      });
    }
  }
  if (resourceType === 'application-load-balancer') {
    const typedOutputs = getTypedOutputsForResource({ resourceType, outputs });
    if (typedOutputs?.integrations?.length) {
      typedOutputs.integrations.forEach(
        (
          { urls, methods, priority, headers, hosts, queryParams, sourceIps, resourceName, listenerPort },
          index,
          arr
        ) => {
          const lineConnectingIntegrations = arr.length - 1 === index ? ' ' : '│';
          linesToPrint.push(
            `  ${arr.length - 1 === index ? '└' : '├'} Port ${tuiManager.colorize(
              'magenta',
              `${listenerPort}`
            )} priority ${tuiManager.colorize('magenta', `${priority}`)} (${tuiManager.colorize('cyan', `${resourceName}`)})`
          );
          linesToPrint = linesToPrint
            .concat(
              methods?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${tuiManager.colorize('blue', 'methods')} - ${methods
                      .map((method) => tuiManager.colorize('gray', method))
                      .join(' || ')}`
                  ]
                : []
            )
            .concat(
              headers?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${tuiManager.colorize('blue', 'headers')}`,
                    ...headers.map(
                      ({ headerName, values }, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${headerName} - ${values.map((hValue) => tuiManager.colorize('gray', hValue)).join(' || ')}`
                    )
                  ]
                : []
            )
            .concat(
              queryParams?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${tuiManager.colorize('blue', 'query-params')}`,
                    ...queryParams.map(
                      ({ paramName, values }, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${paramName} - ${values.map((hValue) => tuiManager.colorize('gray', hValue)).join(' || ')}`
                    )
                  ]
                : []
            )
            .concat(
              hosts?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${tuiManager.colorize('blue', 'hosts')}`,
                    ...hosts.map(
                      (host, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${tuiManager.colorize('gray', host)}`
                    )
                  ]
                : []
            )
            .concat(
              sourceIps?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${tuiManager.colorize('blue', 'source-ips')}`,
                    ...sourceIps.map(
                      (sourceIp, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${tuiManager.colorize('gray', sourceIp)}`
                    )
                  ]
                : []
            )
            .concat([
              `  ${lineConnectingIntegrations} └ ${tuiManager.colorize('blue', 'urls')}`,
              ...urls.map(
                (url, hIndex, hArr) =>
                  `  ${lineConnectingIntegrations}   ${hArr.length - 1 === hIndex ? '└' : '├'} ${tuiManager.colorize(
                    'yellow',
                    url as string
                  )}`
              )
            ]);
        }
      );
    }
  }
  return linesToPrint;
};

// │

export const getResourceInfoLines = ({
  nameChain,
  resourceType,
  links,
  referencableParams,
  outputs,
  showSensitiveValues
}: {
  nameChain: string[];
  resourceType: StackInfoMapResource['resourceType'];
  links: StackInfoMapResource['links'];
  referencableParams: StackInfoMapResource['referencableParams'];
  outputs: StackInfoMapResource['outputs'];
  showSensitiveValues: boolean;
}): { lines: string[]; containsSensitiveValues: boolean } => {
  const linesToPrint = [];
  linesToPrint.push(tuiManager.colorize('cyan', nameChain.join('.')));
  let containsSensitiveValues = false;
  const referencableParamLines = Object.entries(referencableParams)
    .filter(
      ([paramName, { showDuringPrint }]) =>
        showDuringPrint &&
        !(globalStateManager.command !== 'stack:info' && (paramName.endsWith('Arn') || paramName.endsWith('arn')))
    )
    .map(([paramName, { value, ssmParameterName }]) => {
      if (ssmParameterName) {
        containsSensitiveValues = true;
      }
      return `${tuiManager.colorize('blue', `${paramName}`)}: ${
        !ssmParameterName || (ssmParameterName && showSensitiveValues)
          ? value
          : tuiManager.colorize('gray', '<<HIDDEN>>')
      }`;
    });
  const linksLines = Object.entries(links).map(
    ([linkName, link]) => `${tuiManager.colorize('green', `${linkName}`)}: ${link}`
  );

  referencableParamLines.forEach((line, index, arr) =>
    linesToPrint.push(`  ${arr.length - 1 === index ? '└' : '├'} ${line}`)
  );
  linksLines.forEach((line, index, arr) => linesToPrint.push(`  ${arr.length - 1 === index ? '└' : '├'} ${line}`));
  linesToPrint.push(...getResourceTypeSpecificInfoLines({ resourceType, outputs }));
  return { lines: linesToPrint, containsSensitiveValues };
};
