import { Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import {
  AddCardFormValue,
  AddSubscriptionFormValue,
  CardSummary,
  SubscriptionSummary,
  cardShortLabel,
  maskCardNumber,
} from '../card.model';
import { AddCardDialog } from '../add-card-dialog/add-card-dialog';
import { AddSubscriptionDialog } from '../add-subscription-dialog/add-subscription-dialog';

// TODO(backend): no payment-cards/subscriptions API yet, state is in-memory only
const SEED_CARDS: CardSummary[] = [
  {
    id: 'card-1',
    nickname: 'Chase Sapphire',
    network: 'Visa',
    maskedNumber: '**** **** **** 4471',
    cardholderName: 'Marcus X.',
    expiry: '09/28',
  },
  {
    id: 'card-2',
    nickname: 'Amex Platinum',
    network: 'Amex',
    maskedNumber: '**** ****** *1009',
    cardholderName: 'Marcus X.',
    expiry: '03/27',
  },
];

const SEED_SUBSCRIPTIONS: SubscriptionSummary[] = [
  {
    id: 'sub-1',
    serviceName: 'Netflix',
    cardId: 'card-1',
    billingCycle: 'monthly',
    amount: 15.49,
    nextRenewalDate: '',
    linkedVaultEntryId: null,
    remindBeforeRenewal: false,
  },
  {
    id: 'sub-2',
    serviceName: 'GitHub Pro',
    cardId: 'card-2',
    billingCycle: 'yearly',
    amount: 48.0,
    nextRenewalDate: '',
    linkedVaultEntryId: null,
    remindBeforeRenewal: false,
  },
];

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [ButtonModule, AddCardDialog, AddSubscriptionDialog],
  templateUrl: './card-list.html',
  styleUrl: './card-list.scss',
})
export class CardList {
  protected readonly cards = signal<CardSummary[]>(SEED_CARDS);
  protected readonly subscriptions = signal<SubscriptionSummary[]>(SEED_SUBSCRIPTIONS);

  protected readonly addCardVisible = signal(false);
  protected readonly addSubscriptionVisible = signal(false);

  protected readonly cardsById = computed(() => new Map(this.cards().map((card) => [card.id, card])));

  protected openAddCard(): void {
    this.addCardVisible.set(true);
  }

  protected openAddSubscription(): void {
    this.addSubscriptionVisible.set(true);
  }

  protected addCard(value: AddCardFormValue): void {
    const card: CardSummary = {
      id: crypto.randomUUID(),
      nickname: value.nickname,
      network: value.network,
      maskedNumber: maskCardNumber(value.cardNumber),
      cardholderName: value.cardholderName,
      expiry: value.expiry,
    };

    this.cards.update((current) => [...current, card]);
  }

  protected addSubscription(value: AddSubscriptionFormValue): void {
    const subscription: SubscriptionSummary = {
      id: crypto.randomUUID(),
      serviceName: value.serviceName,
      cardId: value.cardId,
      billingCycle: value.billingCycle,
      amount: value.amount,
      nextRenewalDate: value.nextRenewalDate,
      linkedVaultEntryId: value.linkedVaultEntryId,
      remindBeforeRenewal: value.remindBeforeRenewal,
    };

    this.subscriptions.update((current) => [...current, subscription]);
  }

  protected cardLabelFor(cardId: string | null): string {
    if (!cardId) return '—';
    const card = this.cardsById().get(cardId);
    return card ? cardShortLabel(card) : '—';
  }

  protected formatAmount(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
