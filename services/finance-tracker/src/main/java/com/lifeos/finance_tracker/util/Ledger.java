package com.lifeos.finance_tracker.util;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;

/** What counts as real spending or income: not a duplicate, not ignored, not a move between own accounts. */
public final class Ledger {

  private Ledger() {}

  public static boolean counts(Transaction t) {
    return !t.isDuplicate() && !t.isTransfer() && t.getStatus() != TransactionStatus.IGNORED;
  }
}
