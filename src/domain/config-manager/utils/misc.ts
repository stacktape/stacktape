import { RESOURCE_DEFAULTS } from '@config';
import { removePropertiesFromObject, serialize } from '@shared/utils/misc';
import { UnexpectedError } from '@utils/errors';

const specialMergeBehaviorProperties = {
  container: (from, to) => {
    if (to.container) {
      merge(from.container, to.container);
    } else {
      to.containers.forEach((container) => {
        // eslint-disable-next-line
        container = merge(from.container, container);
      });
    }
  }
};

const merge = (from: any, to: any) => {
  if (from) {
    for (const prop in from) {
      if (specialMergeBehaviorProperties[prop]) {
        specialMergeBehaviorProperties[prop](from, to);
      } else if (to[prop]) {
        if (typeof from[prop] === 'object') {
          if (typeof to[prop] !== 'object') {
            throw new UnexpectedError({
              customMessage: `Can't merge defaults. Property ${prop} has different type (${from[prop]}, ${to[prop]})`
            });
          }
          if (Array.isArray(from[prop])) {
            if (!Array.isArray(to[prop])) {
              throw new UnexpectedError({
                customMessage: `Can't merge defaults. Property ${prop} has different type (${from[prop]}, ${to[prop]})`
              });
            }
            to[prop] = to[prop].concat(from[prop]);
          } else {
            merge(from[prop], to[prop]);
          }
        }
      } else if (typeof from[prop] === 'object') {
        if (Array.isArray(from[prop])) {
          to[prop] = [].concat(from[prop]);
        } else {
          to[prop] = {};
          merge(from[prop], to[prop]);
        }
      } else {
        to[prop] = from[prop];
      }
    }
  }
};

export const mergeStacktapeDefaults = (resourceDefinition: StpResource) => {
  const res = { ...resourceDefinition };
  // merge(globalDefaults, res);
  merge(RESOURCE_DEFAULTS[resourceDefinition.type], res);
  return res;
};

export const cleanConfigForMinimalTemplateCompilerMode = (conf: StacktapeConfig): StacktapeConfig => {
  const cleanedConfig = removePropertiesFromObject(serialize(conf), [
    'budgetControl',
    'customDomains',
    'directives'
  ]) as StacktapeConfig;
  for (const key in cleanedConfig?.resources || {}) {
    if (cleanedConfig.resources[key].type === 'aws-cdk-construct') {
      delete cleanedConfig[key];
    }
  }
  return cleanedConfig;
};
