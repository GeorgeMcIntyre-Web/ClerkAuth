import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter out non-critical errors
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Don't send rate limit errors to reduce noise
    if (error && typeof error === 'object' && 'message' in error) {
      if ((error.message as string).includes('Rate limit')) {
        return null;
      }
    }
    
    return event;
  },
});