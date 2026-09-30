package com.lifeos.workouts.domains.dto.response;

import java.util.List;

public record SessionDetailResponse(SessionSummaryResponse session, List<SessionExerciseResponse> exercises) {}
