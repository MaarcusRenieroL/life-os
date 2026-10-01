package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.GoalStatus;
import jakarta.validation.constraints.NotNull;

/** Only the explicit states can be set by hand - ON_TRACK/AT_RISK are derived from progress (see
 * GoalProgressCalculator), so setting either is rejected. ACTIVE doubles as resume/unarchive. */
public record UpdateGoalStatusRequest(@NotNull GoalStatus status) {}
