export const queryKeys = {
  urls: ['urls'] as const,
  analyticsSummary: ['analytics', 'summary'] as const,
  analytics: (shortCode: string) => ['analytics', shortCode] as const,
  adminUsers: ['admin', 'users'] as const,
  adminLinks: ['admin', 'links'] as const,
  adminStats: ['admin', 'stats'] as const,
};
