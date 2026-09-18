import { api } from '@/lib/api-client';

const baseUrl = '/v1/finance/reports';

export const reportApi = {
  async getTaxReport(year: number): Promise<Blob> {
    const response = await api.get(`${baseUrl}/tax/${year}`, { responseType: 'blob' });
    return response.data;
  },
  async getCustomReport(startDate: string, endDate: string): Promise<Blob> {
    const response = await api.get(`${baseUrl}/custom`, { params: { startDate, endDate }, responseType: 'blob' });
    return response.data;
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
