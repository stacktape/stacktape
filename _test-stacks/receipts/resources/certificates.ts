import { PRODUCTION_STAGE, STAGING_STAGE } from '../env';

export const getCustomCertificateArn = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return 'arn:aws:acm:us-east-1:381492226074:certificate/ad4ff20e-35b0-48c3-b976-2214c18605fa';
    case STAGING_STAGE:
      return 'arn:aws:acm:us-east-1:905418041574:certificate/e34c044e-5f1b-439a-9db9-d8501b891362';
    case 'dev':
    default:
      return '';
  }
};
