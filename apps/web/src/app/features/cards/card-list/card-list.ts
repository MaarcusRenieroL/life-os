import { Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { CardApiService } from '../../../core/services/card-api.service';
import { AddCardFormValue, CardSummary } from '../card.model';
import { AddCardDialog } from '../add-card-dialog/add-card-dialog';

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [ButtonModule, TooltipModule, AddCardDialog],
  templateUrl: './card-list.html',
  styleUrl: './card-list.scss',
})
export class CardList implements OnInit {
  private readonly cardApi = inject(CardApiService);

  protected readonly cards = signal<CardSummary[]>([]);
  protected readonly loading = signal(true);

  protected readonly addCardVisible = signal(false);

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
}
