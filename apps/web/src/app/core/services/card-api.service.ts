import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  AddCardFormValue,
  CardApiResponse,
  CardSummary,
  cardApiResponseToSummary,
  cardNetworkToApiNetwork,
} from '../../features/cards/card.model';

@Injectable({ providedIn: 'root' })
export class CardApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/vault/cards';

  getCards(): Observable<CardSummary[]> {
    return this.http
      .get<ApiResponse<CardApiResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data.map(cardApiResponseToSummary)));
  }

  createCard(value: AddCardFormValue): Observable<CardSummary> {
    return this.http
      .post<ApiResponse<CardApiResponse>>(this.baseUrl, {
        nickname: value.nickname,
        network: cardNetworkToApiNetwork(value.network),
        cardNumber: value.cardNumber.replace(/\D/g, ''),
        cvv: value.cvv,
        expiry: value.expiry,
        cardHolderName: value.cardholderName,
        billingZip: value.billingZip,
      })
      .pipe(map((response) => cardApiResponseToSummary(response.data)));
  }

  deleteCard(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
