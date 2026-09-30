import { api, unwrap } from '@/lib/api-client';

import type { Anomaly, Dashboard, Insight, PeriodSummary, TrendPoint } from './types';

const baseUrl = '/v1/core/analytics';

export const analyticsApi = {
  dashboard(): Promise<Dashboard> {
    return unwrap(api.get(`${baseUrl}/dashboard`));
  },
  summary(period: 'WEEK' | 'MONTH', asOf?: string): Promise<PeriodSummary> {
    return unwrap(api.get(`${baseUrl}/summary`, { params: { period, asOf } }));
  },
  trends(days: number, bucket: 'DAY' | 'WEEK'): Promise<TrendPoint[]> {
    return unwrap(api.get(`${baseUrl}/trends`, { params: { days, bucket } }));
  },
  anomalies(): Promise<Anomaly[]> {
    return unwrap(api.get(`${baseUrl}/anomalies`));
  },
  insights(days: number): Promise<Insight[]> {
    return unwrap(api.get(`${baseUrl}/insights`, { params: { days } }));
  },
};
