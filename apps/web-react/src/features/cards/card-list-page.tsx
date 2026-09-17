import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AddCardDialog } from './add-card-dialog';
import { cardApi } from './card-api';
import type { AddCardFormValue } from './types';

export function CardListPage() {
  const queryClient = useQueryClient();
  const { data: cards = [] } = useQuery({ queryKey: ['vault', 'cards'], queryFn: cardApi.getCards });
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCard(value: AddCardFormValue) {
    setError(null);
    try {
      await cardApi.createCard(value);
      queryClient.invalidateQueries({ queryKey: ['vault', 'cards'] });
      setAddOpen(false);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Could not add this card - is the vault unlocked?',
      );
    }
  }

  async function deleteCard(id: string) {
    await cardApi.deleteCard(id);
    queryClient.invalidateQueries({ queryKey: ['vault', 'cards'] });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Separate vault section — not shown in default password search.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="group relative rounded-lg border bg-card p-4">
            <button
              className="absolute right-2 top-2 hidden text-xs text-destructive group-hover:block"
              onClick={() => void deleteCard(card.id)}
            >
              Remove
            </button>
            <div className="text-xs uppercase text-muted-foreground">{card.nickname}</div>
            <div className="mt-1 text-xs uppercase text-muted-foreground">{card.network}</div>
            <div className="mt-3 font-mono text-sm">{card.maskedNumber}</div>
            <div className="mt-2 text-sm">{card.cardholderName}</div>
            <div className="mt-1 text-xs text-muted-foreground">EXP {card.expiry}</div>
          </div>
        ))}
        <button
          onClick={() => setAddOpen(true)}
          className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          + add credit or debit card
        </button>
      </div>

      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} onSave={(v) => void addCard(v)} error={error} />
    </div>
  );
}
