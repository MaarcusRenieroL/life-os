package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Published by any service to the shared {@code notification-events} topic; core consumes it
 * into the notifications table that powers the in-app bell, the Today view, and (later) email
 * delivery. {@code requiresAiFallbackApproval} marks a notification that isn't just informational
 * - it's core's cue to show an approve/deny action instead of a plain read receipt, for when an
 * AI-routed task fell back from Ollama to Claude and needs the user's sign-off before spending. */
public record NotificationEventRecord(
    UUID eventId,
    UUID userId,
    String module,
    NotificationEventType type,
    String title,
    String body,
    Map<String, String> metadata,
    boolean requiresAiFallbackApproval,
    Instant occurredAt) {}
