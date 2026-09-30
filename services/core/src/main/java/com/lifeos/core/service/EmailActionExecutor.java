package com.lifeos.core.service;

import com.lifeos.core.domains.record.EmailAction;
import java.util.UUID;

/** Carries a validated {@link EmailAction} out against the module that owns the record. */
public interface EmailActionExecutor {

  /**
   * @param module the module that now holds the record ({@code tasks}, {@code calendar}, {@code finance})
   * @param targetId that module's id for it, kept so the action can be undone
   * @param created false when nothing new was made because it already existed (a subscription that
   *     was already tracked) - such a record must never be deleted on undo
   * @param note anything worth showing next to the item
   */
  record Result(String module, String targetId, boolean created, String note) {}

  /** Throws {@link EmailActionException} with a readable message when the module rejects it. */
  Result execute(UUID userId, EmailAction action);

  /** Removes what {@link #execute} made. */
  void undo(UUID userId, String module, String targetId);

  class EmailActionException extends RuntimeException {
    public EmailActionException(String message, Throwable cause) {
      super(message, cause);
    }

    public EmailActionException(String message) {
      super(message);
    }
  }
}
