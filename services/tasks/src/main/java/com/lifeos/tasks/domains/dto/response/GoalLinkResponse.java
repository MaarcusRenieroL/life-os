package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.GoalStatus;
import java.util.UUID;

/** A link as seen from one goal's page. relation is one of BLOCKS, BLOCKED_BY, SUPPORTS,
 * SUPPORTED_BY - the stored link is directional, this resolves it against the goal being viewed. */
public record GoalLinkResponse(
    UUID id, String relation, UUID otherGoalId, String otherGoalName, GoalStatus otherGoalStatus) {}
