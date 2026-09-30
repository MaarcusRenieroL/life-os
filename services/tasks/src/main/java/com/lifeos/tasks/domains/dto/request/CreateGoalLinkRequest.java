package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.GoalLinkType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** "This goal {type} the target goal" - so BLOCKS means this goal blocks the target. */
public record CreateGoalLinkRequest(@NotNull UUID targetGoalId, @NotNull GoalLinkType linkType) {}
