// This managed first-party proxy belongs to the production PostHog project.
export const POSTHOG_API_HOST = 'https://form-submissions.stacktape.com';
export const POSTHOG_DIRECT_API_HOST = 'https://eu.i.posthog.com';
export const POSTHOG_UI_HOST = 'https://eu.posthog.com';

// PostHog project tokens identify an ingestion project and are intentionally public.
export const POSTHOG_PRODUCTION_PROJECT_TOKEN = 'phc_FZgbDY1hF9qM8u2qg2Y9Q0j65qniei5XSAvV62HZs3U';

export const getPostHogIngestionHost = (environment: string) =>
  environment === 'production' ? POSTHOG_API_HOST : POSTHOG_DIRECT_API_HOST;

export const getPostHogEnvironment = ({
  explicitEnvironment,
  version,
  isDevelopment
}: {
  explicitEnvironment?: string;
  version?: string;
  isDevelopment?: boolean;
}) => {
  if (explicitEnvironment) return explicitEnvironment;
  if (isDevelopment || !version || version === 'dev') return 'local';
  if (version.includes('preview') || version.includes('alpha') || version.includes('beta') || version.includes('rc')) {
    return 'preview';
  }
  return 'production';
};
