export const queryKeys = {
  urls: ['urls'] as const,
  analyticsSummary: ['analytics', 'summary'] as const,
  analytics: (shortCode: string, range: string) => ['analytics', shortCode, range] as const,
  adminUsers: ['admin', 'users'] as const,
  adminLinks: ['admin', 'links'] as const,
  adminStats: ['admin', 'stats'] as const,
};
