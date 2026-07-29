const STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX = 'STP-stack';

export const getStackName = (projectName: string, stage: string) => {
  return `${projectName}-${stage}`;
};

export const getStackCfTemplateDescription = (projectName: string, stage: string, globallyUniqueStackHash: string) => {
  return `${STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX}_${projectName}_${stage}_${globallyUniqueStackHash}`;
};

export const isStacktapeStackDescription = (templateDescription: string): boolean => {
  return !!templateDescription?.startsWith(STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX);
};

export const getStacktapeStackInfoFromTemplateDescription = (templateDescription: string) => {
  if (isStacktapeStackDescription(templateDescription)) {
    const [, projectName, stage, globallyUniqueStackHash] = templateDescription.split('_');
    return {
      projectName,
      stage,
      globallyUniqueStackHash
    };
  }
  return { projectName: '', stage: '', globallyUniqueStackHash: '' };
};
