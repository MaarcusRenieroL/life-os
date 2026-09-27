package com.lifeos.common.domains.dto.response;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One "needs your attention today or soon" item, returned by every module's internal
 * {@code /today} endpoint and aggregated by core's TodayService into one cross-module view. Every
 * module returns this same shape (rather than its own DTO) so core can deserialize and merge
 * them without N slightly-different parsing paths - the one deliberate exception to this
 * codebase's usual "each service keeps its own DTO copy" convention, justified because core is
 * specifically in the business of aggregating this exact shape from every module at once. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodayItemResponse {

  String module;

  // e.g. "habit_due", "interview_upcoming", "bill_due", "budget_alert", "note_followup"
  String type;

  String title;

  String description;

  Instant dueAt;

  // The underlying entity's id, so the frontend can deep-link to it. Left as a plain string
  // (not UUID) since not every module's entity id is necessarily a UUID forever.
  String entityId;

  // "info" | "warning" | "urgent" - drives the frontend's visual treatment, not a strict enum
  // here so each module can express nuance without a shared enum needing a release everywhere.
  String priority;
}
