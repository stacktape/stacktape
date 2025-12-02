import { globalStateManager } from '@application-services/global-state-manager';
import { printer } from '@utils/printer';

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
        const methodPart = `[${printer.colorize('yellow', method)}]`;
        const resourceNamePart = `(${printer.colorize('cyan', resourceName)})`;
        const urlPart = printer.colorize('green', url.toString());
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
            `  ${arr.length - 1 === index ? '└' : '├'} Port ${printer.colorize(
              'magenta',
              `${listenerPort}`
            )} priority ${printer.colorize('magenta', `${priority}`)} (${printer.colorize('cyan', `${resourceName}`)})`
          );
          linesToPrint = linesToPrint
            .concat(
              methods?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${printer.colorize('blue', 'methods')} - ${methods
                      .map((method) => printer.colorize('gray', method))
                      .join(' || ')}`
                  ]
                : []
            )
            .concat(
              headers?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${printer.colorize('blue', 'headers')}`,
                    ...headers.map(
                      ({ headerName, values }, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${headerName} - ${values.map((hValue) => printer.colorize('gray', hValue)).join(' || ')}`
                    )
                  ]
                : []
            )
            .concat(
              queryParams?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${printer.colorize('blue', 'query-params')}`,
                    ...queryParams.map(
                      ({ paramName, values }, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${paramName} - ${values.map((hValue) => printer.colorize('gray', hValue)).join(' || ')}`
                    )
                  ]
                : []
            )
            .concat(
              hosts?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${printer.colorize('blue', 'hosts')}`,
                    ...hosts.map(
                      (host, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${printer.colorize('gray', host)}`
                    )
                  ]
                : []
            )
            .concat(
              sourceIps?.length
                ? [
                    `  ${lineConnectingIntegrations} ├ ${printer.colorize('blue', 'source-ips')}`,
                    ...sourceIps.map(
                      (sourceIp, hIndex, hArr) =>
                        `    ${lineConnectingIntegrations} │ ${
                          hArr.length - 1 === hIndex ? '└' : '├'
                        } ${printer.colorize('gray', sourceIp)}`
                    )
                  ]
                : []
            )
            .concat([
              `  ${lineConnectingIntegrations} └ ${printer.colorize('blue', 'urls')}`,
              ...urls.map(
                (url, hIndex, hArr) =>
                  `  ${lineConnectingIntegrations}   ${hArr.length - 1 === hIndex ? '└' : '├'} ${printer.colorize(
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
  linesToPrint.push(printer.colorize('cyan', nameChain.join('.')));
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
      return `${printer.colorize('blue', `${paramName}`)}: ${
        !ssmParameterName || (ssmParameterName && showSensitiveValues) ? value : printer.colorize('gray', '<<HIDDEN>>')
      }`;
    });
  const linksLines = Object.entries(links).map(
    ([linkName, link]) => `${printer.colorize('green', `${linkName}`)}: ${link}`
  );

  referencableParamLines.forEach((line, index, arr) =>
    linesToPrint.push(`  ${arr.length - 1 === index ? '└' : '├'} ${line}`)
  );
  linksLines.forEach((line, index, arr) => linesToPrint.push(`  ${arr.length - 1 === index ? '└' : '├'} ${line}`));
  linesToPrint.push(...getResourceTypeSpecificInfoLines({ resourceType, outputs }));
  return { lines: linesToPrint, containsSensitiveValues };
};
