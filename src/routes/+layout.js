export const prerender = false;
export const ssr = false;


import * as Sentry from '@sentry/browser';
import { env } from '$env/dynamic/public'

Sentry.init({
  dsn: env.PUBLIC_SENTRY_DSN,
  environment: env.PUBLIC_SENTRY_ENV,
  release: env.PUBLIC_RELEASE_NAME,
  beforeSend: (event, hint) => {
    if (env.PUBLIC_SENTRY_ENV === 'development') return;
    return event;
  },
});
