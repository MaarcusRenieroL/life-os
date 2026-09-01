import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FinanceReportApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/reports';

  getTaxReport(year: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/tax/${year}`, { responseType: 'blob' });
  }

  getCustomReport(startDate: string, endDate: string): Observable<Blob> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get(`${this.baseUrl}/custom`, { params, responseType: 'blob' });
  }
}
