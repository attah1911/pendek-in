export type Role = 'USER' | 'ADMIN';
export type DeviceType = 'MOBILE' | 'DESKTOP' | 'BOT' | 'UNKNOWN';
export type TrendRange = 'week' | 'month' | 'year';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface ShortUrl {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  clickCount: number;
}

export interface ClickEvent {
  id: string;
  shortUrlId: string;
  referrer: string | null;
  deviceType: DeviceType;
  createdAt: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}

export interface DeviceCount {
  deviceType: DeviceType;
  count: number;
}

export interface AnalyticsPayload {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  totalClicks: number;
  trend: TrendPoint[];
  referrers: ReferrerCount[];
  devices: DeviceCount[];
}

export interface AggregateStats {
  totalUrls: number;
  totalClicks: number;
  bestUrl: { shortCode: string; originalUrl: string; clicks: number } | null;
}

export interface GlobalStats {
  totalUsers: number;
  totalUrls: number;
  totalClicks: number;
  newUsersToday: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  banned: boolean;
  createdAt: string;
  urlCount: number;
}

export interface AdminLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  ownerEmail: string | null;
  clickCount: number;
}
