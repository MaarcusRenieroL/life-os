import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { CardApiService } from '../../../core/services/card-api.service';
import {
  AddCardFormValue,
  AddSubscriptionFormValue,
  CardSummary,
  SubscriptionSummary,
  cardShortLabel,
} from '../card.model';
import { AddCardDialog } from '../add-card-dialog/add-card-dialog';
import { AddSubscriptionDialog } from '../add-subscription-dialog/add-subscription-dialog';

// TODO(backend): subscriptions are intentionally staying mock/in-memory - that's
// Finance's territory, not Cards'. Only payment cards are wired to a real API.
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
  imports: [ButtonModule, TooltipModule, AddCardDialog, AddSubscriptionDialog],
  templateUrl: './card-list.html',
  styleUrl: './card-list.scss',
})
export class CardList implements OnInit {
  private readonly cardApi = inject(CardApiService);

  protected readonly cards = signal<CardSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly subscriptions = signal<SubscriptionSummary[]>(SEED_SUBSCRIPTIONS);

  protected readonly addCardVisible = signal(false);
  protected readonly addSubscriptionVisible = signal(false);

  protected readonly cardsById = computed(() => new Map(this.cards().map((card) => [card.id, card])));

  ngOnInit(): void {
    this.loadCards();
  }

  private loadCards(): void {
    this.cardApi.getCards().subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openAddCard(): void {
    this.addCardVisible.set(true);
  }

  protected openAddSubscription(): void {
    this.addSubscriptionVisible.set(true);
  }

  protected addCard(value: AddCardFormValue): void {
    this.cardApi.createCard(value).subscribe({
      next: (card) => this.cards.update((current) => [...current, card]),
      // TODO: surface a real error to the user (e.g. vault locked) instead of
      // silently doing nothing - AddCardDialog has no errorMessage plumbing yet,
      // same gap VaultEntryForm/AddCategoryDialog already solved, copy that.
      error: () => undefined,
    });
  }

  protected deleteCard(id: string): void {
    this.cardApi.deleteCard(id).subscribe(() => {
      this.cards.update((current) => current.filter((c) => c.id !== id));
    });
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
