import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';

import { NotificationResponse } from '../models/job-tracker.model';
import { TokenService } from './token.service';

// Bridges to job-tracker's WebSocket notifications (see JwtChannelInterceptor on the
// backend). Auth happens inside the STOMP CONNECT frame, not the HTTP handshake -
// browsers can't set custom headers on a WebSocket upgrade request, so the token
// goes in as a STOMP header once the raw connection is already open instead.
@Injectable({ providedIn: 'root' })
export class NotificationSocketService implements OnDestroy {
  private readonly tokenService = inject(TokenService);

  private client: Client | null = null;

  readonly latestNotification = signal<NotificationResponse | null>(null);

  connect(): void {
    if (this.client?.active) {
      return;
    }

    const token = this.tokenService.getAccessToken();
    if (!token) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerUrl = `${protocol}//${window.location.host}/ws`;

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.client?.subscribe('/user/queue/notifications', (message: IMessage) => {
          const notification = JSON.parse(message.body) as NotificationResponse;
          this.latestNotification.set(notification);
        });
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
