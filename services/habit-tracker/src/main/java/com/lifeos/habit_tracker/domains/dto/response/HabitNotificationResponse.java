package com.lifeos.habit_tracker.domains.dto.response;

import com.lifeos.habit_tracker.domains.enums.NotificationType;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * One entry in the in-app notification feed. Computed on read, never persisted, so {@code id} is a
 * stable content-derived key for React lists rather than a database identifier.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HabitNotificationResponse {

  /** Stable within a response and across refreshes for the same underlying fact. */
  String id;

  NotificationType type;

  /** "info" | "warning" | "success" - drives the colour the UI renders it in. */
  String severity;

  String title;

  String message;

  /** Null for notifications that aren't about one specific habit (e.g. the weekly summary). */
  UUID habitId;

  String habitName;
}
