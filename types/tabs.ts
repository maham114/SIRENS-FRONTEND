import type { UserProfile } from '@/services/profileService';

export type ReportCategory =
  | 'traffic'
  | 'weather'
  | 'fire'
  | 'crime'
  | 'medical'
  | 'infrastructure'
  | 'emergency'
  | 'accident'
  | 'other';
export type ReportStatus = 'active' | 'expired' | 'resolved';

export type FeedReport = {
  reportId: string;
  imageUrl: string;
  category: ReportCategory;
  description?: string;
  areaName?: string;
  city: string;
  timestamp: unknown;
  status: ReportStatus;
};

export type AlertChannel = 'push' | 'email' | 'sms';

export type AlertPreferences = {
  weather: boolean;
  traffic: boolean;
  highSeverityOnly: boolean;
  notificationChannel: AlertChannel;
};

export type AlertItem = {
  id: string;
  title: string;
  message?: string;
  category: ReportCategory | 'system';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: unknown;
  read?: boolean;
};

export type ReportDraft = {
  category: ReportCategory | null;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  areaName: string;
  city: string;
  coords: { latitude: number; longitude: number } | null;
  imageUri: string | null;
  imageMimeType?: string;
  imageName?: string;
};

export type UploadStage = 'idle' | 'picking' | 'uploading' | 'submitting' | 'success';

export type EditableProfile = Pick<UserProfile, 'city' | 'district'> & {
  displayName: string;
};
