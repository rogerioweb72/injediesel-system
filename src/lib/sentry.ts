import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return  // Sentry disabled when DSN not configured

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,

    // Capture JS exceptions + unhandled promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Performance: sample 10% of transactions in prod, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Error sampling: capture all errors
    sampleRate: 1.0,

    // PRIVACY: never send user PII — only role/id for debugging context
    beforeSend(event) {
      // Strip any request bodies that might contain credentials
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.headers
      }
      return event
    },

    // Don't send errors from browser extensions
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],

    // Ignore known non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Loading chunk \d+ failed/,
    ],
  })
}

export function setSentryUser(id: string, role: string) {
  Sentry.setUser({ id, role })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}

export { Sentry }
