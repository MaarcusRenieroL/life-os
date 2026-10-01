package com.lifeos.batches.domains.enums;

/** What a connected Gmail mailbox is read for. The same address can serve both. */
public enum GmailPurpose {
  /** Bank alerts. */
  FINANCE,
  /** Application confirmations, interview invites, rejections. */
  JOBS
}
